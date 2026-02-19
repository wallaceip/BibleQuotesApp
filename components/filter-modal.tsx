import { Ionicons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import React from 'react';
import {
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_THRESHOLD = 100;

interface FilterModalProps {
    visible: boolean;
    darkMode: boolean;
    language: string;
    selectedFilter: string | null; // null = all, 'favorites'
    onSelectFilter: (filter: string | null) => void;
    onClose: () => void;
}

export const FilterModal = ({
    visible,
    darkMode,
    language,
    selectedFilter,
    onSelectFilter,
    onClose,
}: FilterModalProps) => {
    const translateY = useSharedValue(0);

    const resetPosition = () => {
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    };

    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            if (event.translationY > 0) {
                translateY.value = event.translationY;
            }
        })
        .onEnd((event) => {
            if (event.translationY > DISMISS_THRESHOLD) {
                translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 }, () => {
                    runOnJS(onClose)();
                });
            } else {
                runOnJS(resetPosition)();
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    React.useEffect(() => {
        if (visible) {
            translateY.value = SCREEN_HEIGHT;
            translateY.value = withTiming(0, { duration: 300 });
        }
    }, [visible]);

    const handleClose = () => {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, () => {
            runOnJS(onClose)();
        });
    };

    const handleSelect = (filter: string | null) => {
        onSelectFilter(filter);
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, () => {
            runOnJS(onClose)();
        });
    };

    const theme = {
        text: darkMode ? '#fff' : '#000',
        subText: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
    };

    const labels = {
        title: language === 'zh' ? '篩選' : 'Filter',
        all: language === 'zh' ? '全部' : 'All Quotes',
        favorites: language === 'zh' ? '收藏' : 'Favorites',
    };

    return (
        <Modal animationType="none" transparent={true} visible={visible} onRequestClose={handleClose}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleClose}>
                    <Animated.View style={[styles.modalContent, animatedStyle]}>
                        <GlassView style={[styles.modalInner, darkMode ? styles.modalDark : styles.modalLight]} glassEffectStyle="regular">
                            <TouchableOpacity activeOpacity={1} onPress={() => { }}>
                                {/* Draggable Handle */}
                                <GestureDetector gesture={panGesture}>
                                    <View style={styles.handleArea}>
                                        <View style={styles.modalHandle} />
                                    </View>
                                </GestureDetector>

                                <View style={styles.modalHeader}>
                                    <Text style={[styles.modalTitle, { color: theme.text }]}>{labels.title}</Text>
                                    {selectedFilter !== null && (
                                        <TouchableOpacity onPress={() => handleSelect(null)}>
                                            <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: '500' }}>
                                                {language === 'zh' ? '清除' : 'Clear'}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* All Quotes */}
                                <TouchableOpacity
                                    style={[styles.filterRow, selectedFilter === null && styles.filterRowSelected]}
                                    onPress={() => handleSelect(null)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="infinite" size={20} color={selectedFilter === null ? '#007AFF' : theme.subText} style={{ marginRight: 12 }} />
                                        <Text style={[styles.filterText, { color: selectedFilter === null ? '#007AFF' : theme.text }]}>
                                            {labels.all}
                                        </Text>
                                    </View>
                                    {selectedFilter === null && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                                </TouchableOpacity>

                                {/* Favorites */}
                                <TouchableOpacity
                                    style={[styles.filterRow, selectedFilter === 'favorites' && styles.filterRowSelected]}
                                    onPress={() => handleSelect('favorites')}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="heart" size={20} color={selectedFilter === 'favorites' ? '#007AFF' : '#ff4d4d'} style={{ marginRight: 12 }} />
                                        <Text style={[styles.filterText, { color: selectedFilter === 'favorites' ? '#007AFF' : theme.text }]}>
                                            {labels.favorites}
                                        </Text>
                                    </View>
                                    {selectedFilter === 'favorites' && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                                </TouchableOpacity>
                            </TouchableOpacity>
                        </GlassView>
                    </Animated.View>
                </TouchableOpacity>
            </GestureHandlerRootView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
    },
    modalInner: {
        padding: 20,
        paddingTop: 0,
        paddingBottom: 40,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
    },
    modalDark: { backgroundColor: '#1c1c1e' },
    modalLight: { backgroundColor: '#fff' },
    handleArea: { paddingVertical: 16, alignItems: 'center' },
    modalHandle: { width: 40, height: 5, backgroundColor: 'rgba(128, 128, 128, 0.5)', borderRadius: 3 },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    filterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 4,
    },
    filterRowSelected: {
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
    },
    filterText: { fontSize: 16, fontWeight: '500' },
});
