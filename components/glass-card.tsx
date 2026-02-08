import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';

interface GlassCardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    intensity?: number;
    darkMode?: boolean;
}

export function GlassCard({ children, style, intensity = 40, darkMode = true }: GlassCardProps) {
    return (
        <View style={[styles.container, style]}>
            <BlurView
                intensity={intensity}
                tint={Platform.OS === 'ios' ? (darkMode ? 'systemThinMaterialDark' : 'systemThinMaterialLight') : (darkMode ? 'dark' : 'light')}
                style={styles.blur}
            >
                <View style={[
                    styles.innerContent,
                    darkMode ? styles.darkGlass : styles.lightGlass
                ]}>
                    {children}
                </View>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    blur: {
        flex: 1,
    },
    innerContent: {
        flex: 1,
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
    },
    darkGlass: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    lightGlass: {
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderColor: 'rgba(0, 0, 0, 0.08)',
    },
});
