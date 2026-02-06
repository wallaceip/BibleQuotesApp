import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Share,
  Modal,
  SafeAreaView,
  StatusBar,
  Platform,
  LayoutChangeEvent
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
  cancelAnimation,
  withDelay
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

// Include the new map
import { QUOTES_DATA, CATEGORIES, CATEGORY_TRANSLATIONS } from '../../constants/quotes';

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
  const iconColor = isLiked ? "#ff4d4d" : (darkMode ? "white" : "black");
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

  // NEW: State for multi-selection
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['All']);

  const [modalVisible, setModalVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('en');

  const [bigHeartTrigger, setBigHeartTrigger] = useState(0);
  const [smallHeartTriggers, setSmallHeartTriggers] = useState<{ [key: string]: number }>({});
  const [layout, setLayout] = useState({ width: initialWidth, height: initialHeight });

  const FILTER_OPTIONS = ['All', 'Favorites', ...CATEGORIES.filter(c => c !== 'All')];

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

  // NEW: Multi-Select Filter Logic
  const handleCategoryToggle = (cat: string) => {
    if (cat === 'All') {
      setSelectedCategories(['All']);
      return;
    }

    let newCategories = [...selectedCategories];

    // Remove 'All' if selecting a specific category
    if (newCategories.includes('All')) {
      newCategories = [];
    }

    if (newCategories.includes(cat)) {
      newCategories = newCategories.filter(c => c !== cat);
    } else {
      newCategories.push(cat);
    }

    // If nothing selected, revert to 'All'
    if (newCategories.length === 0) {
      setSelectedCategories(['All']);
    } else {
      setSelectedCategories(newCategories);
    }
  };

  // NEW: Filtering Logic
  let filteredData = QUOTES_DATA;
  if (!selectedCategories.includes('All')) {
    filteredData = QUOTES_DATA.filter(item => {
      // Check if item's category is selected
      const isCategoryMatch = selectedCategories.includes(item.category);
      // Check if 'Favorites' is selected AND item is a favorite
      const isFavoriteMatch = selectedCategories.includes('Favorites') && favorites.includes(item.id);

      return isCategoryMatch || isFavoriteMatch;
    });
  }

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(layout.height - height) > 10 || Math.abs(layout.width - width) > 10) {
      setLayout({ width, height });
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isLiked = favorites.includes(item.id);
    const displayText = language === 'zh' ? item.text_zh : item.text;
    const displayVerse = language === 'zh' ? item.verse_zh : item.verse;

    // Translation for category tag on card
    const displayCategory = language === 'zh' && CATEGORY_TRANSLATIONS[item.category]
      ? CATEGORY_TRANSLATIONS[item.category]
      : item.category.toUpperCase();

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
        <View style={[styles.pageContainer, { backgroundColor: darkMode ? '#000' : '#f0f0f5', width: layout.width, height: layout.height }]}>
          <View style={styles.centerContent}>
            <Text style={[styles.quoteText, { color: darkMode ? '#fff' : '#000' }]}>{displayText}</Text>
            <Text style={[styles.verseText, { color: darkMode ? '#aaa' : '#666' }]}>{displayVerse}</Text>
            <View style={[styles.categoryTag, { borderColor: darkMode ? '#333' : '#ccc' }]}>
              <Text style={[styles.categoryText, { color: darkMode ? '#888' : '#555' }]}>{displayCategory}</Text>
            </View>
          </View>
          <View style={styles.bottomActions}>
            <TouchableOpacity onPress={() => onShare(displayText, displayVerse)} style={styles.iconButton}>
              <Ionicons name="share-outline" size={32} color={darkMode ? "white" : "black"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleIconPress(item.id)} style={styles.iconButton}>
              <AnimatedSmallHeart isLiked={isLiked} forceBounce={smallHeartTriggers[item.id] || 0} darkMode={darkMode} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? '#000' : '#f0f0f5' }]} onLayout={onLayout}>
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />
      <SafeAreaView style={styles.headerContainer}>
        <View style={styles.headerControls}>

          <TouchableOpacity style={[styles.headerButton, { backgroundColor: darkMode ? '#333' : '#ddd', marginRight: 10 }]} onPress={toggleLanguage}>
            <Text style={{ color: darkMode ? "white" : "black", fontSize: 14, fontWeight: 'bold' }}>
              {language === 'en' ? '中' : 'EN'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.headerButton, { backgroundColor: darkMode ? '#333' : '#ddd', marginRight: 10 }]} onPress={toggleTheme}>
            <Ionicons name={darkMode ? "sunny" : "moon"} size={20} color={darkMode ? "white" : "black"} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.headerButton, { backgroundColor: darkMode ? '#333' : '#ddd' }]} onPress={() => setModalVisible(true)}>
            <Ionicons name="filter" size={20} color={darkMode ? "white" : "black"} />
          </TouchableOpacity>

        </View>
      </SafeAreaView>
      <BigHeartOverlay visibleKey={bigHeartTrigger} onFinish={() => { }} />

      {filteredData.length === 0 ? (
        <View style={[styles.pageContainer, { width: layout.width, height: layout.height }]}>
          <Text style={{ color: darkMode ? '#666' : '#999' }}>No quotes found for selection.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToAlignment="start"
          decelerationRate="fast"
          snapToInterval={layout.height}
          disableIntervalMomentum={true}
          getItemLayout={(data, index) => ({ length: layout.height, offset: layout.height * index, index })}
        />
      )}

      {/* FILTER MODAL */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: darkMode ? '#1c1c1e' : '#fff' }]}>
            <Text style={[styles.modalTitle, { color: darkMode ? '#fff' : '#000' }]}>
              {language === 'zh' ? '篩選' : 'Filter'}
            </Text>

            {FILTER_OPTIONS.map((cat) => {
              const isSelected = selectedCategories.includes(cat);
              // Translate label if Chinese selected
              const label = language === 'zh' && CATEGORY_TRANSLATIONS[cat] ? CATEGORY_TRANSLATIONS[cat] : cat;

              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryOption, { borderBottomColor: darkMode ? '#333' : '#eee' }]}
                  onPress={() => handleCategoryToggle(cat)}
                >
                  <Text style={{
                    fontSize: 18,
                    color: isSelected ? (darkMode ? '#fff' : '#000') : '#888',
                    fontWeight: isSelected ? 'bold' : 'normal'
                  }}>
                    {label}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={20} color={darkMode ? "white" : "black"} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={{ marginTop: 20, alignSelf: 'center' }} onPress={() => setModalVisible(false)}>
              <Text style={{ color: darkMode ? '#666' : '#999' }}>{language === 'zh' ? '關閉' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { position: 'absolute', top: Platform.OS === 'android' ? 40 : 10, right: 20, zIndex: 10, alignItems: 'flex-end' },
  headerControls: { flexDirection: 'row' },
  headerButton: { padding: 10, borderRadius: 50, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  pageContainer: { justifyContent: 'center', alignItems: 'center' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, width: '100%' },
  quoteText: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  verseText: { fontSize: 18, fontStyle: 'italic', marginBottom: 20 },
  categoryTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginTop: 10 },
  categoryText: { fontSize: 12, fontWeight: 'bold' },
  bottomActions: { flexDirection: 'row', width: '60%', justifyContent: 'space-around', position: 'absolute', bottom: 80 },
  iconButton: { padding: 10 },
  heartOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 50, pointerEvents: 'none' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 50 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  categoryOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 0.5 },
});