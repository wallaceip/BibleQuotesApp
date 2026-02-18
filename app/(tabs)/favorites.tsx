import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import { getBibleGatewayUrl, Quote } from '../../services/quotes-service';

export default function FavoritesScreen() {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [savedQuotes, setSavedQuotes] = useState<Quote[]>([]);
    const [darkMode, setDarkMode] = useState(true);
    const [language, setLanguage] = useState('en');

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            const storedFavs = await AsyncStorage.getItem('favorites');
            const storedQuotes = await AsyncStorage.getItem('savedFavoriteQuotes');
            const storedTheme = await AsyncStorage.getItem('darkMode');
            const storedLang = await AsyncStorage.getItem('language');

            if (storedFavs) setFavorites(JSON.parse(storedFavs));
            if (storedQuotes) setSavedQuotes(JSON.parse(storedQuotes));
            if (storedTheme !== null) setDarkMode(JSON.parse(storedTheme));
            if (storedLang) setLanguage(storedLang);
        } catch (e) {
            console.log(e);
        }
    };

    const removeFavorite = async (id: string) => {
        const newFavs = favorites.filter(fav => fav !== id);
        setFavorites(newFavs);
        await AsyncStorage.setItem('favorites', JSON.stringify(newFavs));

        const newSaved = savedQuotes.filter(q => q.id !== id);
        setSavedQuotes(newSaved);
        await AsyncStorage.setItem('savedFavoriteQuotes', JSON.stringify(newSaved));
    };

    const favoriteQuotes = savedQuotes.filter(q => favorites.includes(q.id));

    const openPassage = async (verse: string) => {
        const url = getBibleGatewayUrl(verse, language);
        await WebBrowser.openBrowserAsync(url);
    };

    const theme = {
        bg: darkMode ? '#000' : '#f2f2f7',
        text: darkMode ? '#fff' : '#000',
        subText: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
    };

    const labels = {
        title: language === 'zh' ? "收藏" : "Favorites",
        noFavorites: language === 'zh' ? "尚無收藏" : "No favorites yet",
        hint: language === 'zh' ? "雙擊金句來收藏" : "Double-tap a quote to add it here",
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.text }]}>{labels.title}</Text>
                </View>

                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                    {favoriteQuotes.length === 0 ? (
                        <View style={[styles.emptyContainer, darkMode ? styles.cardDark : styles.cardLight]}>
                            <Ionicons name="heart-outline" size={60} color={theme.subText} />
                            <Text style={{ color: theme.subText, marginTop: 20, fontSize: 18, fontWeight: '500' }}>{labels.noFavorites}</Text>
                            <Text style={{ color: theme.subText, marginTop: 8, fontSize: 14, textAlign: 'center' }}>{labels.hint}</Text>
                        </View>
                    ) : (
                        favoriteQuotes.map((item) => (
                            <View key={item.id} style={[styles.favCard, darkMode ? styles.cardDark : styles.cardLight]}>
                                <Text style={[styles.favText, { color: theme.text }]}>
                                    {language === 'zh' ? item.text_zh : item.text}
                                </Text>

                                <View style={styles.favFooter}>
                                    <Text style={[styles.favVerse, { color: theme.subText }]}>
                                        {language === 'zh' ? item.verse_zh : item.verse}
                                    </Text>

                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <TouchableOpacity onPress={() => openPassage(language === 'zh' ? item.verse_zh : item.verse)} style={styles.actionButton}>
                                            <Ionicons name="book-outline" size={22} color="#007AFF" />
                                        </TouchableOpacity>

                                        <TouchableOpacity onPress={() => removeFavorite(item.id)} style={styles.actionButton}>
                                            <Ionicons name="heart" size={26} color="#ff4d4d" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
    title: { fontSize: 34, fontWeight: 'bold' },

    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        padding: 40,
        borderRadius: 20,
    },

    favCard: {
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
    favText: { fontSize: 18, fontWeight: '600', marginBottom: 16, lineHeight: 26 },

    favFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    favVerse: { fontSize: 14, fontStyle: 'italic', flex: 1 },
    actionButton: {
        padding: 8,
    },
});