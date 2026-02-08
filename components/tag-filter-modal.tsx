import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TagChip } from './tag-chip';

interface TagFilterModalProps {
    visible: boolean;
    darkMode: boolean;
    language: string;
    selectedTags: string[];
    allTags: string[];
    getDisplayTag: (tag: string) => string;
    onTagToggle: (tag: string) => void;
    onClearFilters: () => void;
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
    onClose,
}: TagFilterModalProps) => {
    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <View style={[styles.modalContent, darkMode ? styles.modalDark : styles.modalLight]}>
                    <View style={styles.modalHandle} />

                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: darkMode ? '#fff' : '#000' }]}>
                            {language === 'zh' ? '標籤篩選' : 'Filter by Tags'}
                        </Text>
                        {selectedTags.length > 0 && (
                            <TouchableOpacity onPress={onClearFilters}>
                                <Text style={{ color: '#007AFF', fontSize: 14 }}>
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
                        onPress={onClose}
                    >
                        <Text style={{ color: darkMode ? '#fff' : '#000', fontWeight: '600', fontSize: 16 }}>
                            {language === 'zh' ? '完成' : 'Done'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
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
    modalHandle: {
        width: 36,
        height: 5,
        backgroundColor: 'rgba(128, 128, 128, 0.4)',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 16,
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
