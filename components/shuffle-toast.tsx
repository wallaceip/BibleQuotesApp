import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';

interface ShuffleToastProps {
    visible: boolean;
    message: string;
    darkMode: boolean;
}

export const ShuffleToast = ({ visible, message, darkMode }: ShuffleToastProps) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(-20);

    useEffect(() => {
        if (visible) {
            opacity.value = withTiming(1, { duration: 300 });
            translateY.value = withSpring(0);
        } else {
            opacity.value = withTiming(0, { duration: 300 });
            translateY.value = withTiming(-20);
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }]
    }));

    if (!visible && opacity.value === 0) return null;

    return (
        <Animated.View style={[
            styles.toastContainer,
            animatedStyle,
            { backgroundColor: darkMode ? 'rgba(50,50,50,0.95)' : 'rgba(255,255,255,0.95)' }
        ]}>
            <Ionicons name="shuffle" size={18} color={darkMode ? "#fff" : "#000"} style={{ marginRight: 8 }} />
            <Text style={[styles.toastText, { color: darkMode ? "#fff" : "#000" }]}>{message}</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    toastContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 120 : 100,
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
});
