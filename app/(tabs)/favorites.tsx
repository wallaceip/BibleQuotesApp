import React, { useState, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    SafeAreaView,
    ScrollView,
    TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

// Import Data
import { QUOTES_DATA } from '../../constants/quotes';

export default function FavoritesScreen() {
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

    const removeFavorite = async (id: string) => {
        const newFavs = favorites.filter(fav => fav !== id);
        setFavorites(newFavs);
        await AsyncStorage.setItem('favorites', JSON.stringify(newFavs));
    };

    const favoriteQuotes = QUOTES_DATA.filter(q => favorites.includes(q.id));

    const theme = {
        bg: darkMode ? '#000' : '#f2f2f7',
        card: darkMode ? '#1c1c1e' : '#fff',
        text: darkMode ? '#fff' : '#000',
        subText: darkMode ? '#888' : '#666',
    };

    const labels = {
        title: language === 'zh' ? "收藏" : "Favorites",
        noFavorites: language === 'zh' ? "尚無收藏" : "No favorites yet.",
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.text }]}>{labels.title}</Text>
                </View>

                <ScrollView contentContainerStyle={{ padding: 20 }}>
                    {favorites.length === 0 ? (
                        <View style={[styles.emptyContainer, { borderColor: theme.subText }]}>
                            <Ionicons name="heart-dislike-outline" size={60} color={theme.subText} />
                            <Text style={{ color: theme.subText, marginTop: 20, fontSize: 18 }}>{labels.noFavorites}</Text>
                        </View>
                    ) : (
                        favoriteQuotes.map((item) => (
                            <View key={item.id} style={[styles.favCard, { backgroundColor: theme.card }]}>
                                <Text style={[styles.favText, { color: theme.text }]}>
                                    "{language === 'zh' ? item.text_zh : item.text}"
                                </Text>

                                <View style={styles.favFooter}>
                                    <Text style={[styles.favVerse, { color: theme.subText }]}>
                                        {language === 'zh' ? item.verse_zh : item.verse}
                                    </Text>

                                    <TouchableOpacity onPress={() => removeFavorite(item.id)} style={{ padding: 5 }}>
                                        <Ionicons name="heart" size={26} color="#ff4d4d" />
                                    </TouchableOpacity>
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
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, borderStyle: 'dashed', borderWidth: 1, borderRadius: 20, padding: 40 },

    // Favorites Styles
    favCard: { padding: 20, borderRadius: 16, marginBottom: 15 },
    favText: { fontSize: 18, fontWeight: '600', marginBottom: 15, lineHeight: 26 },
    favFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
    favVerse: { fontSize: 14, fontStyle: 'italic' },
});