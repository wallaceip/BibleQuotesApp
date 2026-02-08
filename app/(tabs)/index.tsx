import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  LayoutChangeEvent,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';

import { TagChip } from '../../components/tag-chip';
import { QUOTES_DATA, TAGS, TAG_TRANSLATIONS } from '../../constants/quotes';

const initialWidth = Dimensions.get('window').width;
const initialHeight = Dimensions.get('window').height;

const AnimatedSmallHeart = ({ isLiked, forceBounce, darkMode }: { isLiked: boolean, forceBounce: number, darkMode: boolean }) => {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (isLiked) {
      cancelAnimation(scale);
      scale.value = withSequence(withSpring(1.3, { damping: 10, stiffness: 200 }), withSpring(1));
    } else {
      scale.value = withTiming(1, { duration: 100 });
    }
  }, [isLiked, forceBounce]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const iconColor = isLiked ? "#ff4d4d" : (darkMode ? "#fff" : "#000"); // High contrast
  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name={isLiked ? "heart" : "heart-outline"} size={32} color={iconColor} />
    </Animated.View>
  );
};

const BigHeartOverlay = ({ visibleKey, onFinish }: { visibleKey: number, onFinish: () => void }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (visibleKey > 0) {
      scale.value = 0;
      opacity.value = 0.5;
      scale.value = withSpring(1.2, { damping: 15, stiffness: 300 });
      opacity.value = withDelay(250, withTiming(0, { duration: 250 }, (finished) => { if (finished) runOnJS(onFinish)(); }));
    }
  }, [visibleKey]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  if (visibleKey === 0) return null;
  return (
    <View style={styles.heartOverlay}>
      <Animated.View style={style}>
        <Ionicons name="heart" size={100} color="#ff4d4d" />
      </Animated.View>
    </View>
  );
};

export default function HomeScreen() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('en');

  const [bigHeartTrigger, setBigHeartTrigger] = useState(0);
  const [smallHeartTriggers, setSmallHeartTriggers] = useState<{ [key: string]: number }>({});
  const [layout, setLayout] = useState({ width: initialWidth, height: initialHeight });

  const FILTER_OPTIONS = ['#favorites', ...TAGS];

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    try {
      const storedFavs = await AsyncStorage.getItem('favorites');
      const storedTheme = await AsyncStorage.getItem('darkMode');
      const storedLang = await AsyncStorage.getItem('language');

      if (storedFavs) setFavorites(JSON.parse(storedFavs));
      if (storedTheme !== null) setDarkMode(JSON.parse(storedTheme));
      if (storedLang) setLanguage(storedLang);
    } catch (e) {
      console.log(e);
    }
  };

  const toggleTheme = async () => {
    const newTheme = !darkMode;
    setDarkMode(newTheme);
    await AsyncStorage.setItem('darkMode', JSON.stringify(newTheme));
  };

  const toggleLanguage = async () => {
    const newLang = language === 'en' ? 'zh' : 'en';
    setLanguage(newLang);
    await AsyncStorage.setItem('language', newLang);
  };

  const updateFavorites = async (newFavs: string[]) => {
    setFavorites(newFavs);
    await AsyncStorage.setItem('favorites', JSON.stringify(newFavs));
  };

  const handleIconPress = (id: string) => {
    if (favorites.includes(id)) {
      updateFavorites(favorites.filter(favId => favId !== id));
    } else {
      setSmallHeartTriggers(prev => ({ ...prev, [id]: Date.now() }));
      updateFavorites([...favorites, id]);
    }
  };

  const handleDoubleTap = (id: string) => {
    setBigHeartTrigger(prev => prev + 1);
    if (favorites.includes(id)) {
      updateFavorites(favorites.filter(favId => favId !== id));
    } else {
      setSmallHeartTriggers(prev => ({ ...prev, [id]: Date.now() }));
      updateFavorites([...favorites, id]);
    }
  };

  const onShare = async (text: string, verse: string) => {
    await Share.share({ message: `"${text}" - ${verse}` });
  };

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const clearFilters = () => {
    setSelectedTags([]);
  };

  const [isShuffle, setIsShuffle] = useState(false);
  const [displayData, setDisplayData] = useState<any[]>([]);
  const currentIndexRef = useRef(0);

  // Shuffle Helper
  const getShuffled = useCallback((arr: any[]) => {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = newArr[i];
      newArr[i] = newArr[j];
      newArr[j] = temp;
    }
    return newArr;
  }, []);

  // Filtering Logic (Source Pool)
  const filteredSource = React.useMemo(() => {
    let data = QUOTES_DATA;
    if (selectedTags.length > 0) {
      data = QUOTES_DATA.filter(item => {
        const isFavoriteMatch = selectedTags.includes('#favorites') && favorites.includes(item.id);
        const isTagMatch = item.tags.some(t => selectedTags.includes(t));
        return isFavoriteMatch || isTagMatch;
      });
    }
    return data;
  }, [selectedTags, favorites]);

  // Init/Reset Feed - Only on Filter Change
  useEffect(() => {
    currentIndexRef.current = 0;
    if (isShuffle) {
      setDisplayData(getShuffled(filteredSource));
    } else {
      setDisplayData(filteredSource);
    }
  }, [filteredSource]); // Dependency reduced to avoid reset on shuffle toggle

  // Toggle Shuffle with History Preservation
  const toggleShuffle = () => {
    const newMode = !isShuffle;
    setIsShuffle(newMode);

    if (displayData.length > 0) {
      const currentIdx = currentIndexRef.current;
      // Keep everything up to current visible item
      const history = displayData.slice(0, currentIdx + 1);

      let nextItems = [];
      if (newMode) {
        nextItems = getShuffled(filteredSource);
        // Ensure no immediate repeat
        if (nextItems.length > 0 && history.length > 0 && nextItems[0].id === history[history.length - 1].id) {
          if (nextItems.length > 1) {
            // Swap first with random other
            const swapIdx = Math.floor(Math.random() * (nextItems.length - 1)) + 1;
            [nextItems[0], nextItems[swapIdx]] = [nextItems[swapIdx], nextItems[0]];
          }
        }
      } else {
        nextItems = filteredSource;
      }
      setDisplayData([...history, ...nextItems]);
    }
  };

  const loadMore = () => {
    if (filteredSource.length === 0) return;

    let moreData;
    if (isShuffle) {
      moreData = getShuffled(filteredSource);
      // Smart Shuffle: Prevent back-to-back duplicates at the seam
      if (displayData.length > 0 && moreData.length > 0) {
        const lastItem = displayData[displayData.length - 1];
        if (moreData[0].id === lastItem.id) {
          // Swap first item of new batch with something else
          if (moreData.length > 1) {
            const swapIdx = Math.floor(Math.random() * (moreData.length - 1)) + 1;
            [moreData[0], moreData[swapIdx]] = [moreData[swapIdx], moreData[0]];
          }
        }
      }
    } else {
      moreData = filteredSource;
    }

    setDisplayData(prev => [...prev, ...moreData]);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(layout.height - height) > 10 || Math.abs(layout.width - width) > 10) {
      setLayout({ width, height });
    }
  };

  const getDisplayTag = (tag: string) => {
    if (language === 'zh' && TAG_TRANSLATIONS[tag]) {
      return TAG_TRANSLATIONS[tag];
    }
    return tag;
  };

  // Single Tag Selection (for pill click)
  const handleSingleTagSelect = (tag: string) => {
    if (selectedTags.includes(tag) && selectedTags.length === 1) {
      setSelectedTags([]); // Toggle off if it's the only one
    } else {
      setSelectedTags([tag]);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isLiked = favorites.includes(item.id);
    const displayText = language === 'zh' ? item.text_zh : item.text;
    const displayVerse = language === 'zh' ? item.verse_zh : item.verse;

    let lastTap: number | null = null;
    const handleTapEvents = () => {
      const now = Date.now();
      if (lastTap && (now - lastTap) < 300) {
        handleDoubleTap(item.id);
        lastTap = null;
      } else {
        lastTap = now;
      }
    };

    return (
      <TouchableWithoutFeedback onPress={handleTapEvents}>
        {/* Full Screen Page */}
        <View style={[styles.pageContainer, { backgroundColor: darkMode ? '#000' : '#f0f0f5', width: layout.width, height: layout.height }]}>

          <View style={styles.centerContent}>
            {/* Top Spacer to balance Bottom Actions for true centering */}
            <View style={{ height: 200 }} />

            {/* Quote Card */}
            <View style={[styles.quoteCard, darkMode ? styles.cardDark : styles.cardLight]}>
              <Text style={[styles.quoteText, { color: darkMode ? '#fff' : '#000' }]}>{displayText}</Text>
              <Text style={[styles.verseText, { color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>{displayVerse}</Text>

              {/* Tags Display - Clickable */}
              <View style={styles.tagsRow}>
                {item.tags.slice(0, 3).map((tag: string) => (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => handleSingleTagSelect(tag)}
                    style={[styles.tagPill, darkMode ? styles.tagPillDark : styles.tagPillLight]}
                  >
                    <Text style={[styles.tagText, { color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }]}>
                      {getDisplayTag(tag)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Bottom Actions - Clean & High Contrast */}
            {/* Bottom Actions - Clean Icons */}
            <View style={styles.bottomActions}>
              <TouchableOpacity onPress={() => onShare(displayText, displayVerse)} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                <Ionicons name="share-outline" size={32} color={darkMode ? "#fff" : "#000"} />
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleShuffle} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                <Ionicons name={isShuffle ? "shuffle" : "shuffle-outline"} size={32} color={isShuffle ? "#007AFF" : (darkMode ? "#fff" : "#000")} style={{ opacity: isShuffle ? 1 : 0.6 }} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleIconPress(item.id)} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                <AnimatedSmallHeart isLiked={isLiked} forceBounce={smallHeartTriggers[item.id] || 0} darkMode={darkMode} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? '#000' : '#f0f0f5' }]} onLayout={onLayout}>
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />

      {/* Header Controls - No Glass */}
      <SafeAreaView style={styles.headerContainer}>
        <View style={styles.headerControls}>
          <TouchableOpacity onPress={toggleLanguage}>
            <View style={[styles.headerButton, darkMode ? styles.btnDark : styles.btnLight]}>
              <Text style={{ color: darkMode ? "#fff" : "#000", fontSize: 13, fontWeight: '700' }}>
                {language === 'en' ? '中' : 'EN'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleTheme}>
            <View style={[styles.headerButton, darkMode ? styles.btnDark : styles.btnLight]}>
              <Ionicons name={darkMode ? "sunny" : "moon"} size={20} color={darkMode ? "#fff" : "#000"} />
            </View>
          </TouchableOpacity>



          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <View style={[styles.headerButton, darkMode ? styles.btnDark : styles.btnLight, selectedTags.length > 0 && styles.activeFilterButton]}>
              <Ionicons name="pricetag" size={20} color={selectedTags.length > 0 ? "#fff" : (darkMode ? "#fff" : "#000")} />
            </View>
            {selectedTags.length > 0 && <View style={styles.filterBadge} />}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <BigHeartOverlay visibleKey={bigHeartTrigger} onFinish={() => { }} />

      {displayData.length === 0 ? (
        <View style={[styles.pageContainer, { width: layout.width, height: layout.height }]}>
          <View style={[styles.emptyCard, darkMode ? styles.cardDark : styles.cardLight]}>
            <Ionicons name="search-outline" size={48} color={darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} />
            <Text style={{ color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)', marginTop: 16, fontSize: 16 }}>
              {language === 'zh' ? '沒有符合的金句' : 'No quotes match your filters'}
            </Text>
            <TouchableOpacity onPress={clearFilters} style={styles.clearButton}>
              <Text style={{ color: '#007AFF', fontSize: 14 }}>
                {language === 'zh' ? '清除篩選' : 'Clear Filters'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={displayData}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToAlignment="start"
          decelerationRate="fast"
          snapToInterval={layout.height}
          disableIntervalMomentum={true}
          getItemLayout={(data, index) => ({ length: layout.height, offset: layout.height * index, index })}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.y / layout.height);
            currentIndexRef.current = index;
          }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
        />
      )}

      {/* TAG FILTER MODAL - Standard Native Look */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={[styles.modalContent, darkMode ? styles.modalDark : styles.modalLight]}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: darkMode ? '#fff' : '#000' }]}>
                {language === 'zh' ? '標籤篩選' : 'Filter by Tags'}
              </Text>
              {selectedTags.length > 0 && (
                <TouchableOpacity onPress={clearFilters}>
                  <Text style={{ color: '#007AFF', fontSize: 14 }}>
                    {language === 'zh' ? '清除' : 'Clear'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.tagsScrollView} showsVerticalScrollIndicator={false}>
              {/* Favorites Tag */}
              <Text style={[styles.sectionLabel, { color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>
                {language === 'zh' ? '收藏' : 'Collection'}
              </Text>
              <View style={styles.tagsContainer}>
                <TagChip
                  tag={language === 'zh' ? '#收藏' : '#favorites'}
                  selected={selectedTags.includes('#favorites')}
                  onPress={() => handleTagToggle('#favorites')}
                  darkMode={darkMode}
                />
              </View>

              {/* All Tags */}
              <Text style={[styles.sectionLabel, { color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)', marginTop: 20 }]}>
                {language === 'zh' ? '所有標籤' : 'All Tags'}
              </Text>
              <View style={styles.tagsContainer}>
                {TAGS.map((tag) => (
                  <TagChip
                    key={tag}
                    tag={getDisplayTag(tag)}
                    selected={selectedTags.includes(tag)}
                    onPress={() => handleTagToggle(tag)}
                    darkMode={darkMode}
                  />
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: darkMode ? '#fff' : '#000', fontWeight: '600', fontSize: 16 }}>
                {language === 'zh' ? '完成' : 'Done'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { position: 'absolute', top: Platform.OS === 'android' ? 40 : 50, right: 20, zIndex: 10, alignItems: 'flex-end' },
  headerControls: { flexDirection: 'row', gap: 10 },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  activeFilterButton: {
    backgroundColor: '#007AFF',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: { // Kept if needed
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },

  pageContainer: { justifyContent: 'center', alignItems: 'center' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, width: '100%' },

  quoteCard: {
    padding: 32,
    borderRadius: 24,
    width: '100%',
    maxWidth: 380,
  },
  cardDark: {
    backgroundColor: '#1c1c1e',
  },
  cardLight: {
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  quoteText: { fontSize: 26, fontWeight: '600', textAlign: 'center', marginBottom: 20, lineHeight: 36 },
  verseText: { fontSize: 16, fontStyle: 'italic', textAlign: 'center', marginBottom: 20 },

  tagsRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8 },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  tagPillDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'transparent',
  },
  tagPillLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderColor: 'transparent',
  },
  tagText: { fontSize: 12, fontWeight: '500' },

  // Buttons Logic
  bottomActions: {
    flexDirection: 'row',
    gap: 40, // Increased gap for clean icon look
    marginTop: 80, // A bit lower as requested
    marginBottom: 20,
  },
  // actionButton removed
  btnDark: {
    backgroundColor: '#333', // Distinct dark gray
  },
  btnLight: {
    backgroundColor: '#fff',
  },

  heartOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 50, pointerEvents: 'none' },

  emptyCard: {
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    maxWidth: 340,
  },
  clearButton: {
    marginTop: 20,
    padding: 12,
  },

  // Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
  },
  modalDark: {
    backgroundColor: '#1c1c1e',
  },
  modalLight: {
    backgroundColor: '#fff',
  },
  modalHandle: {
    width: 36,
    height: 5,
    backgroundColor: 'rgba(128, 128, 128, 0.4)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  sectionLabel: { fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  tagsScrollView: { maxHeight: 400 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  doneButton: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
});