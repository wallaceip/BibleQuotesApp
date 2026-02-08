import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { QUOTES_DATA } from '../../constants/quotes';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function OptionsScreen() {
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('en');

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifFreq, setNotifFreq] = useState('Daily');
  const [notifTime, setNotifTime] = useState(new Date());
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem('darkMode');
      const storedLang = await AsyncStorage.getItem('language');
      const storedNotif = await AsyncStorage.getItem('notifications');
      const storedFreq = await AsyncStorage.getItem('notifFreq');
      const storedTime = await AsyncStorage.getItem('notifTime');

      if (storedTheme !== null) setDarkMode(JSON.parse(storedTheme));
      if (storedLang) setLanguage(storedLang);
      if (storedNotif) setNotifEnabled(JSON.parse(storedNotif));
      if (storedFreq) setNotifFreq(storedFreq);
      if (storedTime) setNotifTime(new Date(storedTime));
    } catch (e) {
      console.log(e);
    }
  };

  const toggleDarkMode = async (value: boolean) => {
    setDarkMode(value);
    await AsyncStorage.setItem('darkMode', JSON.stringify(value));
  };

  const changeLanguage = async (lang: string) => {
    setLanguage(lang);
    await AsyncStorage.setItem('language', lang);
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || notifTime;
    setShowTimePicker(Platform.OS === 'ios');
    setNotifTime(currentDate);
  };

  const sendTestNotification = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please enable notifications in system settings.');
      return;
    }

    const randomQuote = QUOTES_DATA[Math.floor(Math.random() * QUOTES_DATA.length)];
    const title = language === 'zh' ? "測試通知" : "Test Notification";
    const bodyText = language === 'zh' ? randomQuote.text_zh : randomQuote.text;
    const bodyVerse = language === 'zh' ? randomQuote.verse_zh : randomQuote.verse;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: `"${bodyText}" - ${bodyVerse}`
      },
      trigger: null, // Immediate
    });
  };

  const saveNotificationSettings = async () => {
    if (notifEnabled) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please enable notifications in system settings.');
        setNotifEnabled(false);
        return;
      }

      await Notifications.cancelAllScheduledNotificationsAsync();

      const randomQuote = QUOTES_DATA[Math.floor(Math.random() * QUOTES_DATA.length)];
      const title = language === 'zh' ? "每日金句" : "Daily Quote";
      const bodyText = language === 'zh' ? randomQuote.text_zh : randomQuote.text;
      const bodyVerse = language === 'zh' ? randomQuote.verse_zh : randomQuote.verse;

      // Calculate trigger
      const triggerHour = notifTime.getHours();
      const triggerMinute = notifTime.getMinutes();

      const trigger: Notifications.CalendarTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: triggerHour,
        minute: triggerMinute,
        repeats: true,
      };

      if (notifFreq === 'Weekly') {
        trigger.weekday = 1; // Sunday
      }

      await Notifications.scheduleNotificationAsync({
        content: { title, body: `"${bodyText}" - ${bodyVerse}` },
        trigger,
      });

      const timeStr = notifTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const confirmMsg = language === 'zh'
        ? `通知已設定 (${notifFreq === 'Daily' ? '每日' : '每週'} ${timeStr})`
        : `Notifications set to ${notifFreq} at ${timeStr}`;

      Alert.alert('Success', confirmMsg);
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }

    await AsyncStorage.setItem('notifications', JSON.stringify(notifEnabled));
    await AsyncStorage.setItem('notifFreq', notifFreq);
    await AsyncStorage.setItem('notifTime', notifTime.toISOString());
    setNotifModalVisible(false);
  };

  const theme = {
    bg: darkMode ? '#000' : '#f2f2f7',
    text: darkMode ? '#fff' : '#000',
    subText: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
    cardBg: darkMode ? '#1c1c1e' : '#fff',
  };

  const labels = {
    settings: language === 'zh' ? "選項" : "Options",
    general: language === 'zh' ? "一般" : "General",
    language: language === 'zh' ? "語言" : "Language",
    darkMode: language === 'zh' ? "深色模式" : "Dark Mode",
    notifications: language === 'zh' ? "通知" : "Notifications",
    daily: language === 'zh' ? "每日" : "Daily",
    weekly: language === 'zh' ? "每週" : "Weekly",
    off: language === 'zh' ? "關閉" : "Off",
    allowNotif: language === 'zh' ? "允許通知" : "Allow Notifications",
    freq: language === 'zh' ? "頻率" : "Frequency",
    time: language === 'zh' ? "時間" : "Time",
    testNotif: language === 'zh' ? "測試通知" : "Test Push Notification",
    cancel: language === 'zh' ? "取消" : "Cancel",
    done: language === 'zh' ? "完成" : "Done"
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>{labels.settings}</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

          <Text style={[styles.sectionTitle, { color: theme.subText }]}>{labels.general}</Text>
          <View style={[styles.card, { backgroundColor: theme.cardBg }]}>

            {/* Language Selector */}
            <View style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="language" size={22} color={theme.text} style={{ marginRight: 12 }} />
                <Text style={[styles.rowText, { color: theme.text }]}>{labels.language}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
                  onPress={() => changeLanguage('en')}
                >
                  <Text style={{ color: language === 'en' ? 'white' : theme.subText, fontWeight: '600' }}>EN</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.langBtn, language === 'zh' && styles.langBtnActive]}
                  onPress={() => changeLanguage('zh')}
                >
                  <Text style={{ color: language === 'zh' ? 'white' : theme.subText, fontWeight: '600' }}>中文</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.separator, { backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />

            {/* Dark Mode */}
            <View style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="moon" size={22} color={theme.text} style={{ marginRight: 12 }} />
                <Text style={[styles.rowText, { color: theme.text }]}>{labels.darkMode}</Text>
              </View>
              <Switch value={darkMode} onValueChange={toggleDarkMode} />
            </View>

            <View style={[styles.separator, { backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />

            {/* Notification Modal Link */}
            <TouchableOpacity style={styles.row} onPress={() => setNotifModalVisible(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="notifications" size={22} color={theme.text} style={{ marginRight: 12 }} />
                <Text style={[styles.rowText, { color: theme.text }]}>{labels.notifications}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: theme.subText, marginRight: 8 }}>
                  {notifEnabled ? (notifFreq === 'Daily' ? labels.daily : labels.weekly) : labels.off}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={theme.subText} />
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* NOTIFICATION MODAL */}
      <Modal
        visible={notifModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNotifModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', backgroundColor: theme.cardBg }]}>
            <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
              <Text style={{ color: '#007AFF', fontSize: 17 }}>{labels.cancel}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{labels.notifications}</Text>
            <TouchableOpacity onPress={saveNotificationSettings}>
              <Text style={{ color: '#007AFF', fontSize: 17, fontWeight: 'bold' }}>{labels.done}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }}>
            <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
              <View style={styles.row}>
                <Text style={[styles.rowText, { color: theme.text }]}>{labels.allowNotif}</Text>
                <Switch value={notifEnabled} onValueChange={setNotifEnabled} />
              </View>
            </View>

            {notifEnabled && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.subText, marginTop: 24 }]}>{labels.freq}</Text>
                <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                  <TouchableOpacity style={styles.row} onPress={() => setNotifFreq('Daily')}>
                    <Text style={[styles.rowText, { color: theme.text }]}>{labels.daily}</Text>
                    {notifFreq === 'Daily' && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                  </TouchableOpacity>
                  <View style={[styles.separator, { backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
                  <TouchableOpacity style={styles.row} onPress={() => setNotifFreq('Weekly')}>
                    <Text style={[styles.rowText, { color: theme.text }]}>{labels.weekly}</Text>
                    {notifFreq === 'Weekly' && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                  </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, { color: theme.subText, marginTop: 24 }]}>{labels.time}</Text>
                <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                  <View style={styles.row}>
                    <Text style={[styles.rowText, { color: theme.text }]}>{labels.time}</Text>
                    <DateTimePicker
                      testID="dateTimePicker"
                      value={notifTime}
                      mode="time"
                      is24Hour={true}
                      display="default"
                      onChange={onTimeChange}
                      themeVariant={darkMode ? 'dark' : 'light'}
                      style={{ width: 100 }}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.testButton, { backgroundColor: theme.cardBg }]}
                  onPress={sendTestNotification}
                >
                  <Text style={{ color: '#007AFF', fontWeight: '600', fontSize: 16 }}>{labels.testNotif}</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  title: { fontSize: 34, fontWeight: 'bold' },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 16, textTransform: 'uppercase', color: '#888' },

  card: {
    borderRadius: 10,
    overflow: 'hidden',
  },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  rowText: { fontSize: 17 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 16 },

  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
  },
  langBtnActive: {
    backgroundColor: '#007AFF',
  },

  modalContainer: { flex: 1, paddingTop: Platform.OS === 'android' ? 20 : 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 17, fontWeight: '600' },

  testButton: {
    marginTop: 30,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});