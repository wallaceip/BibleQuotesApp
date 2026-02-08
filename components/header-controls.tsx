import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';

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
    const [optionsExpanded, setOptionsExpanded] = useState(false);

    // Animation values for vertical slide in/out
    const translateY = useSharedValue(-50);
    const optionsOpacity = useSharedValue(0);

    const toggleOptions = () => {
        const newState = !optionsExpanded;
        setOptionsExpanded(newState);

        if (newState) {
            // Slide down (fast)
            translateY.value = withTiming(0, { duration: 150 });
            optionsOpacity.value = withTiming(1, { duration: 100 });
        } else {
            // Slide up (fast)
            translateY.value = withTiming(-50, { duration: 150 });
            optionsOpacity.value = withTiming(0, { duration: 100 });
        }
    };

    const animatedOptionsStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: optionsOpacity.value,
    }));

    return (
        <>
            {/* Options Button - Top Right */}
            <View style={styles.optionsContainer}>
                <TouchableOpacity onPress={toggleOptions}>
                    <View style={[styles.controlButton, darkMode ? styles.btnDark : styles.btnLight]}>
                        <Ionicons name={optionsExpanded ? "close" : "menu"} size={22} color={darkMode ? "#fff" : "#000"} />
                    </View>
                </TouchableOpacity>

                {/* Expanded Options - Slide down vertically */}
                <Animated.View style={[styles.expandedOptions, animatedOptionsStyle]}>
                    <TouchableOpacity onPress={onToggleLanguage}>
                        <View style={[styles.controlButton, darkMode ? styles.btnDark : styles.btnLight]}>
                            <Text style={{ color: darkMode ? "#fff" : "#000", fontSize: 13, fontWeight: '700' }}>
                                {language === 'en' ? '中' : 'EN'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onToggleTheme}>
                        <View style={[styles.controlButton, darkMode ? styles.btnDark : styles.btnLight]}>
                            <Ionicons name={darkMode ? "sunny" : "moon"} size={20} color={darkMode ? "#fff" : "#000"} />
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            </View>

            {/* Filter Button - Bottom Right, just above tab bar */}
            <View style={styles.filterContainer}>
                <TouchableOpacity onPress={onOpenFilter}>
                    <View style={[styles.controlButton, styles.filterButton, darkMode ? styles.btnDark : styles.btnLight, selectedTagsCount > 0 && styles.activeFilterButton]}>
                        <Ionicons name="funnel" size={22} color={selectedTagsCount > 0 ? "#fff" : (darkMode ? "#fff" : "#000")} />
                    </View>
                    {selectedTagsCount > 0 && <View style={styles.filterBadge} />}
                </TouchableOpacity>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    optionsContainer: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 50 : 60,
        right: 20,
        zIndex: 10,
        alignItems: 'flex-end',
    },
    expandedOptions: {
        marginTop: 10,
        gap: 10,
    },
    filterContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'android' ? 20 : 30, // Just above tab bar
        right: 20,
        zIndex: 10,
    },
    controlButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8, // Square with rounded corners
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    filterButton: {
        width: 50,
        height: 50,
        borderRadius: 10, // Slightly larger, still square
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
        borderRadius: 6,
        minWidth: 12,
        height: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
