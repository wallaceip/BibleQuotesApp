import React from 'react';
import { Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { TagChip } from './tag-chip';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_THRESHOLD = 100; // Swipe down 100px to dismiss

interface TagFilterModalProps {
    visible: boolean;
    darkMode: boolean;
    language: string;
    selectedTags: string[];
    allTags: string[];
    getDisplayTag: (tag: string) => string;
    onTagToggle: (tag: string) => void;
    onClearFilters: () => void;
    onDone: () => void;
    onClose: () => void;
}

export const TagFilterModal = ({
    visible,
    darkMode,
    language,
    selectedTags,
    allTags,
    getDisplayTag,
    onTagToggle,
    onClearFilters,
    onDone,
    onClose,
}: TagFilterModalProps) => {
    const translateY = useSharedValue(0);

    const resetPosition = () => {
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    };

    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            // Only allow dragging down (positive Y)
            if (event.translationY > 0) {
                translateY.value = event.translationY;
            }
        })
        .onEnd((event) => {
            if (event.translationY > DISMISS_THRESHOLD) {
                // Animate out and close
                translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 }, () => {
                    runOnJS(onClose)();
                });
            } else {
                // Snap back
                runOnJS(resetPosition)();
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    // Animate slide up when modal opens
    React.useEffect(() => {
        if (visible) {
            // Start from bottom and slide up smoothly
            translateY.value = SCREEN_HEIGHT;
            translateY.value = withTiming(0, { duration: 300 });
        }
    }, [visible]);

    // Animated close (used for tap outside)
    const handleCloseWithAnimation = () => {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, () => {
            runOnJS(onClose)();
        });
    };

    // Animated Done (animate first, then apply filters)
    const handleDoneWithAnimation = () => {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, () => {
            runOnJS(onDone)();
        });
    };

    return (
        <Modal animationType="none" transparent={true} visible={visible} onRequestClose={handleCloseWithAnimation}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleCloseWithAnimation}>
                    <Animated.View style={[styles.modalContent, darkMode ? styles.modalDark : styles.modalLight, animatedStyle]}>
                        <TouchableOpacity activeOpacity={1} onPress={() => { }}>
                            {/* Draggable Handle Area */}
                            <GestureDetector gesture={panGesture}>
                                <View style={styles.handleArea}>
                                    <View style={styles.modalHandle} />
                                </View>
                            </GestureDetector>

                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: darkMode ? '#fff' : '#000' }]}>
                                    {language === 'zh' ? '標籤篩選' : 'Filter by Tags'}
                                </Text>
                                {selectedTags.length > 0 && (
                                    <TouchableOpacity onPress={onClearFilters}>
                                        <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: '500' }}>
                                            {language === 'zh' ? '清除' : 'Clear'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <ScrollView style={styles.tagsScrollView} showsVerticalScrollIndicator={false}>
                                {/* Favorites Tag */}
                                <Text style={[styles.sectionLabel, { color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>
                                    {language === 'zh' ? '收藏' : 'Collection'}
                                </Text>
                                <View style={styles.tagsContainer}>
                                    <TagChip
                                        tag={language === 'zh' ? '#收藏' : '#favorites'}
                                        selected={selectedTags.includes('#favorites')}
                                        onPress={() => onTagToggle('#favorites')}
                                        darkMode={darkMode}
                                    />
                                </View>

                                {/* All Tags */}
                                <Text style={[styles.sectionLabel, { color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)', marginTop: 20 }]}>
                                    {language === 'zh' ? '所有標籤' : 'All Tags'}
                                </Text>
                                <View style={styles.tagsContainer}>
                                    {allTags.map((tag) => (
                                        <TagChip
                                            key={tag}
                                            tag={getDisplayTag(tag)}
                                            selected={selectedTags.includes(tag)}
                                            onPress={() => onTagToggle(tag)}
                                            darkMode={darkMode}
                                        />
                                    ))}
                                </View>
                            </ScrollView>

                            <TouchableOpacity
                                style={[styles.doneButton, { backgroundColor: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]}
                                onPress={handleDoneWithAnimation}
                            >
                                <Text style={{ color: darkMode ? '#fff' : '#000', fontWeight: '600', fontSize: 16 }}>
                                    {language === 'zh' ? '完成' : 'Done'}
                                </Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
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
        padding: 20,
        paddingTop: 0,
        paddingBottom: 40,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '80%',
    },
    modalDark: {
        backgroundColor: '#1c1c1e',
    },
    modalLight: {
        backgroundColor: '#fff',
    },
    handleArea: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    modalHandle: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(128, 128, 128, 0.5)',
        borderRadius: 3,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    tagsScrollView: {
        maxHeight: 400,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    doneButton: {
        marginTop: 20,
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
});
