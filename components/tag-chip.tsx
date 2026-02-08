import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

interface TagChipProps {
    tag: string;
    selected?: boolean;
    onPress?: () => void;
    darkMode?: boolean;
    style?: ViewStyle;
}

export function TagChip({ tag, selected = false, onPress, darkMode = true, style }: TagChipProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={[
                styles.container,
                darkMode ? styles.containerDark : styles.containerLight,
                selected && (darkMode ? styles.selectedDark : styles.selectedLight),
                style
            ]}
        >
            <Text style={[
                styles.text,
                darkMode ? styles.textDark : styles.textLight,
                selected && styles.textSelected,
            ]}>
                {tag}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 10,
        marginBottom: 10,
    },
    containerDark: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    containerLight: {
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        borderColor: 'rgba(0, 0, 0, 0.05)',
    },
    selectedDark: {
        backgroundColor: '#007AFF', // iOS Blue
        borderColor: '#007AFF',
    },
    selectedLight: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    text: {
        fontSize: 15,
        fontWeight: '500',
    },
    textDark: {
        color: 'rgba(255, 255, 255, 0.8)',
    },
    textLight: {
        color: 'rgba(0, 0, 0, 0.7)',
    },
    textSelected: {
        color: '#fff',
        fontWeight: '600',
    },
});
