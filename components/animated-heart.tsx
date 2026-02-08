import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    cancelAnimation,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';

interface AnimatedSmallHeartProps {
    isLiked: boolean;
    forceBounce: number;
    darkMode: boolean;
}

export const AnimatedSmallHeart = ({ isLiked, forceBounce, darkMode }: AnimatedSmallHeartProps) => {
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
    const iconColor = isLiked ? "#ff4d4d" : (darkMode ? "#fff" : "#000");

    return (
        <Animated.View style={animatedStyle}>
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={32} color={iconColor} />
        </Animated.View>
    );
};

interface BigHeartOverlayProps {
    visibleKey: number;
    onFinish: () => void;
}

export const BigHeartOverlay = ({ visibleKey, onFinish }: BigHeartOverlayProps) => {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (visibleKey > 0) {
            scale.value = 0;
            opacity.value = 0.5;
            scale.value = withSpring(1.2, { damping: 15, stiffness: 300 });
            opacity.value = withDelay(250, withTiming(0, { duration: 250 }, (finished) => {
                if (finished) runOnJS(onFinish)();
            }));
        }
    }, [visibleKey]);

    const style = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value
    }));

    if (visibleKey === 0) return null;

    return (
        <View style={styles.heartOverlay}>
            <Animated.View style={style}>
                <Ionicons name="heart" size={100} color="#ff4d4d" />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    heartOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
        pointerEvents: 'none',
    },
});
