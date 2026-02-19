import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlassView } from 'expo-glass-effect';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { FilterModal } from '../../components/filter-modal';
import { HeaderControls } from '../../components/header-controls';
import { Toast } from '../../components/shuffle-toast';
import { fetchRandomBatch, getBibleGatewayUrl, Quote, refreshPool } from '../../services/quotes-service';

const initialWidth = Dimensions.get('window').width;
const initialHeight = Dimensions.get('window').height;

export default function HomeScreen() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('en');
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [bigHeartTrigger, setBigHeartTrigger] = useState(0);
  const [smallHeartTriggers, setSmallHeartTriggers] = useState<{ [key: string]: number }>({});
  const [layout, setLayout] = useState({ width: initialWidth, height: initialHeight });

  const [displayData, setDisplayData] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const currentIndexRef = useRef(0);
  const listRef = useRef<FlatList>(null);
  const hasLoadedRef = useRef(false);

  // Filter
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

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

      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        await loadInitialQuotes();
      }
    } catch (e) {
      console.log(e);
    }
  };

  const loadInitialQuotes = async () => {
    setIsLoading(true);
    try {
      const quotes = await fetchRandomBatch(5);
      setDisplayData(quotes);
      currentIndexRef.current = 0;
    } catch (e) {
      console.log('Failed to load initial quotes:', e);
    } finally {
      setIsLoading(false);
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

  const saveFavoriteQuoteData = async (quote: Quote) => {
    try {
      const stored = await AsyncStorage.getItem('savedFavoriteQuotes');
      const savedQuotes: Quote[] = stored ? JSON.parse(stored) : [];
      if (!savedQuotes.find(q => q.id === quote.id)) {
        savedQuotes.push(quote);
        await AsyncStorage.setItem('savedFavoriteQuotes', JSON.stringify(savedQuotes));
      }
    } catch (e) {
      console.log(e);
    }
  };

  const removeFavoriteQuoteData = async (quoteId: string) => {
    try {
      const stored = await AsyncStorage.getItem('savedFavoriteQuotes');
      if (stored) {
        const savedQuotes: Quote[] = JSON.parse(stored);
        const filtered = savedQuotes.filter(q => q.id !== quoteId);
        await AsyncStorage.setItem('savedFavoriteQuotes', JSON.stringify(filtered));
      }
    } catch (e) {
      console.log(e);
    }
  };

  // -- History --
  const saveToHistory = async (quote: Quote) => {
    try {
      const stored = await AsyncStorage.getItem('history');
      const history: Quote[] = stored ? JSON.parse(stored) : [];
      if (history.length > 0 && history[0].id === quote.id) return;
      const entry = { ...quote, viewedAt: Date.now() };
      history.unshift(entry);
      if (history.length > 200) history.splice(200);
      await AsyncStorage.setItem('history', JSON.stringify(history));
    } catch (e) {
      console.log(e);
    }
  };

  // -- Toast --
  const showToast = (msg?: string) => {
    setToastMessage(msg || '');
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  };

  // -- Filtering --
  const filteredData = selectedFilter === 'favorites'
    ? displayData.filter(q => favorites.includes(q.id))
    : displayData;

  // -- Refresh --
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshPool()
      .then(() => fetchRandomBatch(5))
      .then(quotes => {
        setDisplayData(quotes);
        currentIndexRef.current = 0;
        showToast();
      })
      .catch(e => console.log('Refresh failed:', e))
      .finally(() => setRefreshing(false));
  }, []);

  const loadMore = async () => {
    if (isFetchingMore) return;
    setIsFetchingMore(true);
    try {
      const moreQuotes = await fetchRandomBatch(5);
      setDisplayData(prev => [...prev, ...moreQuotes]);
    } catch (e) {
      console.log('Failed to load more:', e);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(layout.height - height) > 10 || Math.abs(layout.width - width) > 10) {
      setLayout({ width, height });
    }
  };

  const handleIconPress = (id: string) => {
    const item = displayData.find(q => q.id === id);
    if (favorites.includes(id)) {
      updateFavorites(favorites.filter(favId => favId !== id));
      removeFavoriteQuoteData(id);
    } else {
      setSmallHeartTriggers(prev => ({ ...prev, [id]: Date.now() }));
      updateFavorites([...favorites, id]);
      if (item) saveFavoriteQuoteData(item);
    }
  };

  const handleDoubleTap = (id: string) => {
    const item = displayData.find(q => q.id === id);
    if (favorites.includes(id)) {
      updateFavorites(favorites.filter(favId => favId !== id));
      removeFavoriteQuoteData(id);
    } else {
      setBigHeartTrigger(prev => prev + 1);
      setSmallHeartTriggers(prev => ({ ...prev, [id]: Date.now() }));
      updateFavorites([...favorites, id]);
      if (item) saveFavoriteQuoteData(item);
    }
  };

  const onShare = async (text: string, verse: string) => {
    await Share.share({ message: `"${text}" - ${verse}` });
  };

  const openPassage = async (verse: string) => {
    const url = getBibleGatewayUrl(verse, language);
    await WebBrowser.openBrowserAsync(url);
  };

  const renderItem = ({ item }: { item: Quote }) => {
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
        <View style={[styles.pageContainer, { backgroundColor: darkMode ? '#000' : '#f0f0f5', width: layout.width, height: layout.height }]}>
          <View style={styles.centerContent}>
            <GlassView style={[styles.quoteCard, darkMode ? styles.cardDark : styles.cardLight]} glassEffectStyle="regular">
              <Text style={[styles.quoteText, { color: darkMode ? '#fff' : '#000' }]}>{displayText}</Text>
              <Text style={[styles.verseText, { color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>{displayVerse}</Text>
            </GlassView>

            <View style={styles.bottomActions}>
              <TouchableOpacity onPress={() => onShare(displayText, displayVerse)} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                <Ionicons name="share-outline" size={32} color={darkMode ? "#fff" : "#000"} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => openPassage(language === 'zh' ? item.verse_zh : item.verse)} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                <Ionicons name="book-outline" size={32} color={darkMode ? "#fff" : "#000"} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleIconPress(item.id)} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                <AnimatedSmallHeart isLiked={isLiked} forceBounce={smallHeartTriggers[item.id] || 0} darkMode={darkMode} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback >
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: darkMode ? '#000' : '#f0f0f5' }]}>
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />

      <Toast
        visible={toastVisible}
        message={toastMessage || (language === 'zh' ? "已刷新" : "Refreshed")}
        icon={selectedFilter ? 'funnel' : 'shuffle'}
        darkMode={darkMode}
      />

      <HeaderControls
        language={language}
        darkMode={darkMode}
        selectedTagsCount={selectedFilter ? 1 : 0}
        onToggleLanguage={toggleLanguage}
        onToggleTheme={toggleTheme}
        onOpenFilter={() => setFilterModalVisible(true)}
      />

      <BigHeartOverlay visibleKey={bigHeartTrigger} onFinish={() => { }} />

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        darkMode={darkMode}
        language={language}
        selectedFilter={selectedFilter}
        onSelectFilter={(f) => {
          setSelectedFilter(f);
          if (f === 'favorites') {
            showToast(language === 'zh' ? '篩選：收藏' : 'Filter: Favorites');
          }
        }}
        onClose={() => setFilterModalVisible(false)}
      />

      {isLoading && displayData.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={darkMode ? '#fff' : '#007AFF'} />
          <Text style={{ color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)', marginTop: 16, fontSize: 16 }}>
            {language === 'zh' ? '正在獲取經文...' : 'Fetching verses...'}
          </Text>
        </View>
      ) : displayData.length === 0 ? (
        <View style={styles.loadingContainer}>
          <View style={[styles.emptyCard, darkMode ? styles.cardDark : styles.cardLight]}>
            <Ionicons name="cloud-offline-outline" size={48} color={darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} />
            <Text style={{ color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)', marginTop: 16, fontSize: 16, textAlign: 'center' }}>
              {language === 'zh' ? '無法載入經文，請檢查網路連接' : 'Could not load verses. Check your connection.'}
            </Text>
            <TouchableOpacity onPress={loadInitialQuotes} style={styles.retryButton}>
              <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: '600' }}>
                {language === 'zh' ? '重試' : 'Retry'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToAlignment="start"
          decelerationRate="fast"
          snapToInterval={layout.height}
          disableIntervalMomentum={true}
          getItemLayout={(_data, index) => ({ length: layout.height, offset: layout.height * index, index })}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.y / layout.height);
            currentIndexRef.current = index;
            if (filteredData[index]) {
              saveToHistory(filteredData[index]);
            }
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
          onEndReachedThreshold={1}
          ListFooterComponent={isFetchingMore ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={darkMode ? '#fff' : '#007AFF'} />
            </View>
          ) : null}
          onLayout={onLayout}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, width: '100%' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  quoteCard: {
    padding: 32,
    borderRadius: 24,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
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
  verseText: { fontSize: 16, fontStyle: 'italic', textAlign: 'center' },

  bottomActions: {
    flexDirection: 'row',
    gap: 40,
    marginTop: 80,
    marginBottom: 20,
  },

  emptyCard: {
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    maxWidth: 340,
  },
  retryButton: {
    marginTop: 20,
    padding: 12,
  },
});

