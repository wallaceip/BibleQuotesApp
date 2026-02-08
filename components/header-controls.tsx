import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HeaderControlsProps {
    language: string;
    darkMode: boolean;
    selectedTagsCount: number;
    onToggleLanguage: () => void;
    onToggleTheme: () => void;
    onOpenFilter: () => void;
}

export const HeaderControls = ({
    language,
    darkMode,
    selectedTagsCount,
    onToggleLanguage,
    onToggleTheme,
    onOpenFilter,
}: HeaderControlsProps) => {
    return (
        <View style={styles.headerContainer}>
            <View style={styles.headerControls}>
                <TouchableOpacity onPress={onToggleLanguage}>
                    <View style={[styles.headerButton, darkMode ? styles.btnDark : styles.btnLight]}>
                        <Text style={{ color: darkMode ? "#fff" : "#000", fontSize: 13, fontWeight: '700' }}>
                            {language === 'en' ? '中' : 'EN'}
                        </Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={onToggleTheme}>
                    <View style={[styles.headerButton, darkMode ? styles.btnDark : styles.btnLight]}>
                        <Ionicons name={darkMode ? "sunny" : "moon"} size={20} color={darkMode ? "#fff" : "#000"} />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={onOpenFilter}>
                    <View style={[styles.headerButton, darkMode ? styles.btnDark : styles.btnLight, selectedTagsCount > 0 && styles.activeFilterButton]}>
                        <Ionicons name="pricetag" size={20} color={selectedTagsCount > 0 ? "#fff" : (darkMode ? "#fff" : "#000")} />
                    </View>
                    {selectedTagsCount > 0 && <View style={styles.filterBadge} />}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 100 : 110,
        right: 20,
        zIndex: 10,
        alignItems: 'flex-end',
    },
    headerControls: {
        flexDirection: 'row',
        gap: 10,
    },
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
    btnDark: {
        backgroundColor: '#333',
    },
    btnLight: {
        backgroundColor: '#fff',
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
});
