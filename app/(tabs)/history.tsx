import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlassView } from 'expo-glass-effect';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import { getBibleGatewayUrl, Quote } from '../../services/quotes-service';

interface HistoryEntry extends Quote {
    viewedAt: number;
}

export default function HistoryScreen() {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [darkMode, setDarkMode] = useState(true);
    const [language, setLanguage] = useState('en');

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            const storedHistory = await AsyncStorage.getItem('history');
            const storedFavs = await AsyncStorage.getItem('favorites');
            const storedTheme = await AsyncStorage.getItem('darkMode');
            const storedLang = await AsyncStorage.getItem('language');

            if (storedHistory) setHistory(JSON.parse(storedHistory));
            if (storedFavs) setFavorites(JSON.parse(storedFavs));
            if (storedTheme !== null) setDarkMode(JSON.parse(storedTheme));
            if (storedLang) setLanguage(storedLang);
        } catch (e) {
            console.log(e);
        }
    };

    const clearHistory = async () => {
        const title = language === 'zh' ? '清除歷史' : 'Clear History';
        const message = language === 'zh' ? '確定要清除所有瀏覽歷史嗎？' : 'Are you sure you want to clear all browsing history?';
        const cancel = language === 'zh' ? '取消' : 'Cancel';
        const confirm = language === 'zh' ? '清除' : 'Clear';

        Alert.alert(title, message, [
            { text: cancel, style: 'cancel' },
            {
                text: confirm, style: 'destructive', onPress: async () => {
                    setHistory([]);
                    await AsyncStorage.setItem('history', JSON.stringify([]));
                }
            }
        ]);
    };

    const removeFromHistory = async (id: string) => {
        const newHistory = history.filter(h => h.id !== id);
        setHistory(newHistory);
        await AsyncStorage.setItem('history', JSON.stringify(newHistory));
    };

    const toggleFavorite = async (item: HistoryEntry) => {
        const isFav = favorites.includes(item.id);
        let newFavs: string[];

        if (isFav) {
            newFavs = favorites.filter(f => f !== item.id);
            // Remove from saved quote data
            const stored = await AsyncStorage.getItem('savedFavoriteQuotes');
            if (stored) {
                const savedQuotes: Quote[] = JSON.parse(stored);
                await AsyncStorage.setItem('savedFavoriteQuotes', JSON.stringify(savedQuotes.filter(q => q.id !== item.id)));
            }
        } else {
            newFavs = [...favorites, item.id];
            // Save full quote data
            const stored = await AsyncStorage.getItem('savedFavoriteQuotes');
            const savedQuotes: Quote[] = stored ? JSON.parse(stored) : [];
            if (!savedQuotes.find(q => q.id === item.id)) {
                const { viewedAt, ...quoteData } = item;
                savedQuotes.push(quoteData);
                await AsyncStorage.setItem('savedFavoriteQuotes', JSON.stringify(savedQuotes));
            }
        }

        setFavorites(newFavs);
        await AsyncStorage.setItem('favorites', JSON.stringify(newFavs));
    };

    const openPassage = async (verse: string) => {
        const url = getBibleGatewayUrl(verse, language);
        await WebBrowser.openBrowserAsync(url);
    };

    const formatTime = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (language === 'zh') {
            if (mins < 1) return '剛剛';
            if (mins < 60) return `${mins} 分鐘前`;
            if (hours < 24) return `${hours} 小時前`;
            return `${days} 天前`;
        } else {
            if (mins < 1) return 'Just now';
            if (mins < 60) return `${mins}m ago`;
            if (hours < 24) return `${hours}h ago`;
            return `${days}d ago`;
        }
    };

    const theme = {
        bg: darkMode ? '#000' : '#f2f2f7',
        text: darkMode ? '#fff' : '#000',
        subText: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
    };

    const labels = {
        title: language === 'zh' ? '歷史' : 'History',
        noHistory: language === 'zh' ? '尚無瀏覽歷史' : 'No history yet',
        hint: language === 'zh' ? '滑動瀏覽金句後會記錄在這裡' : 'Quotes you browse will appear here',
        clearAll: language === 'zh' ? '清除全部' : 'Clear All',
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.text }]}>{labels.title}</Text>
                    {history.length > 0 && (
                        <TouchableOpacity onPress={clearHistory}>
                            <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: '500' }}>{labels.clearAll}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                    {history.length === 0 ? (
                        <GlassView style={[styles.emptyContainer, darkMode ? styles.cardDark : styles.cardLight]} glassEffectStyle="regular">
                            <Ionicons name="time-outline" size={60} color={theme.subText} />
                            <Text style={{ color: theme.subText, marginTop: 20, fontSize: 18, fontWeight: '500' }}>{labels.noHistory}</Text>
                            <Text style={{ color: theme.subText, marginTop: 8, fontSize: 14, textAlign: 'center' }}>{labels.hint}</Text>
                        </GlassView>
                    ) : (
                        history.map((entry) => {
                            const isFav = favorites.includes(entry.id);
                            return (
                                <GlassView key={`${entry.id}-${entry.viewedAt}`} style={[styles.historyCard, darkMode ? styles.cardDark : styles.cardLight]} glassEffectStyle="regular">
                                    <Text style={[styles.historyText, { color: theme.text }]}>
                                        {language === 'zh' ? entry.text_zh : entry.text}
                                    </Text>

                                    <View style={styles.historyFooter}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.historyVerse, { color: theme.subText }]}>
                                                {language === 'zh' ? entry.verse_zh : entry.verse}
                                            </Text>
                                            <Text style={[styles.timestamp, { color: theme.subText }]}>
                                                {formatTime(entry.viewedAt)}
                                            </Text>
                                        </View>

                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <TouchableOpacity onPress={() => openPassage(language === 'zh' ? entry.verse_zh : entry.verse)} style={styles.actionButton}>
                                                <Ionicons name="book-outline" size={22} color="#007AFF" />
                                            </TouchableOpacity>

                                            <TouchableOpacity onPress={() => toggleFavorite(entry)} style={styles.actionButton}>
                                                <Ionicons name={isFav ? "heart" : "heart-outline"} size={24} color={isFav ? "#ff4d4d" : theme.subText} />
                                            </TouchableOpacity>

                                            <TouchableOpacity onPress={() => removeFromHistory(entry.id)} style={styles.actionButton}>
                                                <Ionicons name="close-circle" size={24} color={theme.subText} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </GlassView>
                            );
                        })
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 34, fontWeight: 'bold' },

    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        padding: 40,
        borderRadius: 20,
    },

    historyCard: {
        padding: 24,
        borderRadius: 20,
        marginBottom: 16,
    },
    cardDark: {
        backgroundColor: '#1c1c1e',
    },
    cardLight: {
        backgroundColor: '#fff',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    historyText: { fontSize: 18, fontWeight: '600', marginBottom: 16, lineHeight: 26 },

    historyFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    historyVerse: { fontSize: 14, fontStyle: 'italic' },
    timestamp: { fontSize: 12, marginTop: 4 },
    actionButton: {
        padding: 8,
    },
});
