import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  LayoutChangeEvent,
  Platform,
  RefreshControl,
  SafeAreaView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

import { AnimatedSmallHeart, BigHeartOverlay } from '../../components/animated-heart';
import { HeaderControls } from '../../components/header-controls';
import { Toast } from '../../components/shuffle-toast';
import { TagFilterModal } from '../../components/tag-filter-modal';
import { QUOTES_DATA, TAGS, TAG_TRANSLATIONS } from '../../constants/quotes';

const initialWidth = Dimensions.get('window').width;
const initialHeight = Dimensions.get('window').height;

export default function HomeScreen() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('en');
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<'shuffle' | 'filter'>('shuffle');

  const [bigHeartTrigger, setBigHeartTrigger] = useState(0);
  const [smallHeartTriggers, setSmallHeartTriggers] = useState<{ [key: string]: number }>({});
  const [layout, setLayout] = useState({ width: initialWidth, height: initialHeight });

  const [displayData, setDisplayData] = useState<any[]>([]);
  const currentIndexRef = useRef(0);
  const listRef = useRef<FlatList>(null);

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

  // Init/Reset Feed - Always Shuffle
  useEffect(() => {
    // If resetting due to tag change, ensure we check if we should keep current quote
    // Logic moved to handleTagToggle/handleSingleTagSelect to avoid harsh reset
    // This effect acts as initial load or full reset
    if (displayData.length === 0) {
      currentIndexRef.current = 0;
      setDisplayData(getShuffled(filteredSource));
    }
  }, [filteredSource, getShuffled]); // Only runs if source changes significantly AND data is empty?
  // We need to be careful. If tags change, filteredSource changes.
  // We want to handle that manually in tag selection to preserve quote.
  // But if favorites change (outside of tag selection), maybe we update source.
  // Let's rely on manual updates for tag changes and use effect for initial/radical changes?
  // Actually, we can just let this effect run if filteredSource changes, BUT we check if we can preserve?
  // React effects are hard to intercept.
  // Better approach: Remove filteredSource as dependency for auto-wipe.
  // Instead, have a separate effect that checks if current displayed quotes are still valid?
  // Or: Just manually set displayData when tags change.

  // Manual Tag Selection Handler - Preserves Current Quote
  const applyFilterWithPreservation = (newTags: string[], showToastFlag: boolean = true) => {
    // 1. Get new source
    let newSource = QUOTES_DATA;
    if (newTags.length > 0) {
      newSource = QUOTES_DATA.filter(item => {
        const isFav = newTags.includes('#favorites') && favorites.includes(item.id);
        const isTag = item.tags.some(t => newTags.includes(t));
        return isFav || isTag;
      });
    }

    // 2. Identify current quote
    let currentQuote = null;
    if (displayData.length > 0 && currentIndexRef.current < displayData.length) {
      currentQuote = displayData[currentIndexRef.current];
    }

    // 3. Generate new feed
    let newFeed = getShuffled(newSource);

    // 4. If current quote is still valid in new source, put it first
    const shouldPreserve = currentQuote && newSource.some(item => item.id === currentQuote.id);
    if (shouldPreserve) {
      // Remove current quote from newFeed to avoid duplicate at start
      newFeed = newFeed.filter(item => item.id !== currentQuote.id);
      // Prepend current quote
      newFeed = [currentQuote, ...newFeed];
      currentIndexRef.current = 0;
    } else {
      currentIndexRef.current = 0;
    }

    // Update state first, then scroll after React renders
    setDisplayData(newFeed);
    setSelectedTags(newTags);

    // Defer scroll to after state update completes
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    });

    // Show Toast only if requested
    if (showToastFlag) {
      showToast('filter');
    }
  };

  const showToast = (type: 'shuffle' | 'filter' = 'shuffle') => {
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  };

  const handleTagToggle = (tag: string) => {
    // Only update selectedTags for visual state in modal
    // Data refresh happens only when Done is pressed
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSingleTagSelect = (tag: string) => {
    // If tag is already the only selected tag, deselect it (visual only)
    if (selectedTags.includes(tag) && selectedTags.length === 1) {
      setSelectedTags([]);
    } else {
      // Select this tag and open filter modal for confirmation
      setSelectedTags([tag]);
      setModalVisible(true);
    }
  };

  const clearFilters = () => {
    // Only clear selectedTags for visual state in modal
    // Data refresh happens only when Done is pressed
    setSelectedTags([]);
  };

  // Pull to Refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      // Shuffle EVERYTHING including current quote
      const newFeed = getShuffled(filteredSource);
      setDisplayData(newFeed);
      currentIndexRef.current = 0;
      showToast();
      setRefreshing(false);
    }, 600);
  }, [filteredSource, getShuffled]);

  const loadMore = () => {
    if (filteredSource.length === 0) return;

    // Always use Smart Shuffle
    const moreData = getShuffled(filteredSource);

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

  const handleIconPress = (id: string) => {
    if (favorites.includes(id)) {
      updateFavorites(favorites.filter(favId => favId !== id));
    } else {
      setSmallHeartTriggers(prev => ({ ...prev, [id]: Date.now() }));
      updateFavorites([...favorites, id]);
    }
  };

  const handleDoubleTap = (id: string) => {
    if (favorites.includes(id)) {
      updateFavorites(favorites.filter(favId => favId !== id));
    } else {
      setBigHeartTrigger(prev => prev + 1); // Only trigger animation on LIKE
      setSmallHeartTriggers(prev => ({ ...prev, [id]: Date.now() }));
      updateFavorites([...favorites, id]);
    }
  };

  const onShare = async (text: string, verse: string) => {
    await Share.share({ message: `"${text}" - ${verse}` });
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
                    style={[
                      styles.tagPill,
                      darkMode ? styles.tagPillDark : styles.tagPillLight,
                      selectedTags.includes(tag) && { backgroundColor: '#007AFF', borderColor: '#007AFF' }
                    ]}
                  >
                    <Text style={[
                      styles.tagText,
                      { color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' },
                      selectedTags.includes(tag) && { color: '#fff' }
                    ]}>
                      {getDisplayTag(tag)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Bottom Actions - Clean Icons */}
            <View style={styles.bottomActions}>
              <TouchableOpacity onPress={() => onShare(displayText, displayVerse)} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                <Ionicons name="share-outline" size={32} color={darkMode ? "#fff" : "#000"} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => Speech.speak(`${displayText}. ${displayVerse}`, {
                  language: language === 'zh' ? 'zh-HK' : 'en-US',
                  rate: 0.9
                })}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Ionicons name="volume-high-outline" size={32} color={darkMode ? "#fff" : "#000"} />
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
    <SafeAreaView style={[styles.container, { backgroundColor: darkMode ? '#000' : '#f0f0f5' }]}>
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />

      {/* Toast Notification */}
      <Toast
        visible={toastVisible}
        message={toastType === 'filter'
          ? (language === 'zh' ? "已套用篩選" : "Filters Applied")
          : (language === 'zh' ? "已刷新" : "Shuffled")
        }
        icon={toastType === 'filter' ? 'funnel' : 'shuffle'}
        darkMode={darkMode}
      />

      {/* Header */}
      <HeaderControls
        language={language}
        darkMode={darkMode}
        selectedTagsCount={selectedTags.length}
        onToggleLanguage={toggleLanguage}
        onToggleTheme={toggleTheme}
        onOpenFilter={() => setModalVisible(true)}
      />

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={darkMode ? "#fff" : "#000"}
              title={language === 'zh' ? "刷新中..." : "Refreshing..."}
              titleColor={darkMode ? "#fff" : "#000"}
              progressViewOffset={Platform.OS === 'android' ? 120 : 20}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
        />
      )}

      {/* Tag Filter Modal */}
      <TagFilterModal
        visible={modalVisible}
        darkMode={darkMode}
        language={language}
        selectedTags={selectedTags}
        allTags={TAGS}
        getDisplayTag={getDisplayTag}
        onTagToggle={handleTagToggle}
        onClearFilters={clearFilters}
        onDone={() => {
          applyFilterWithPreservation(selectedTags, true);
          setModalVisible(false);
        }}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { position: 'absolute', top: Platform.OS === 'android' ? 100 : 110, right: 20, zIndex: 10, alignItems: 'flex-end' },
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

  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100, // Below header
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
  },

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