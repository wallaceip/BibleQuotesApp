import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Switch, 
  SafeAreaView, 
  ScrollView, 
  Alert, 
  Modal, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';

// Import Data (Needed for Notification Random Quote)
import { QUOTES_DATA } from '../../constants/quotes';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export default function OptionsScreen() {
  // Favorites State Removed
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('en'); 
  
  // Notification States
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifFreq, setNotifFreq] = useState('Daily');
  const [notifModalVisible, setNotifModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      // Favorites Load Removed
      const storedTheme = await AsyncStorage.getItem('darkMode');
      const storedLang = await AsyncStorage.getItem('language');
      const storedNotif = await AsyncStorage.getItem('notifications');
      const storedFreq = await AsyncStorage.getItem('notifFreq');
      
      if (storedTheme !== null) setDarkMode(JSON.parse(storedTheme));
      if (storedLang) setLanguage(storedLang);
      if (storedNotif) setNotifEnabled(JSON.parse(storedNotif));
      if (storedFreq) setNotifFreq(storedFreq);
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
      const body = language === 'zh' ? randomQuote.text_zh : randomQuote.text;

      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: { seconds: 5, repeats: false },
      });
      
      const confirmMsg = language === 'zh' 
        ? `通知已開啟 (${notifFreq === 'Daily' ? '每日' : '每週'})` 
        : `Notifications set to ${notifFreq}`;
      
      Alert.alert('Success', confirmMsg);
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    
    await AsyncStorage.setItem('notifications', JSON.stringify(notifEnabled));
    await AsyncStorage.setItem('notifFreq', notifFreq);
    setNotifModalVisible(false);
  };

  const theme = {
    bg: darkMode ? '#000' : '#f2f2f7',
    card: darkMode ? '#1c1c1e' : '#fff',
    text: darkMode ? '#fff' : '#000',
    subText: darkMode ? '#888' : '#666',
    border: darkMode ? '#333' : '#e5e5ea',
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
    freqDesc: language === 'zh' 
      ? (notifFreq === 'Daily' ? "您將在每天上午 9:00 收到金句。" : "您將在每週日收到金句。")
      : (notifFreq === 'Daily' ? "You will receive a quote every morning at 9:00 AM." : "You will receive a quote every Sunday."),
    cancel: language === 'zh' ? "取消" : "Cancel",
    done: language === 'zh' ? "完成" : "Done"
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>{labels.settings}</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }}>
          
          <Text style={[styles.sectionTitle, { color: theme.subText }]}>{labels.general}</Text>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            
            {/* Language Selector */}
            <View style={styles.row}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="language" size={22} color={theme.text} style={{marginRight: 10}} />
                <Text style={[styles.rowText, { color: theme.text }]}>{labels.language}</Text>
              </View>
              <View style={{flexDirection: 'row'}}>
                <TouchableOpacity 
                  style={[styles.langBtn, language === 'en' && {backgroundColor: '#333'}]} 
                  onPress={() => changeLanguage('en')}
                >
                  <Text style={{color: language === 'en' ? 'white' : theme.subText}}>EN</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.langBtn, language === 'zh' && {backgroundColor: '#333'}, {marginLeft: 5}]} 
                  onPress={() => changeLanguage('zh')}
                >
                  <Text style={{color: language === 'zh' ? 'white' : theme.subText}}>中文</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.separator, { backgroundColor: theme.border }]} />

            {/* Dark Mode */}
            <View style={styles.row}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="moon" size={22} color={theme.text} style={{marginRight: 10}} />
                <Text style={[styles.rowText, { color: theme.text }]}>{labels.darkMode}</Text>
              </View>
              <Switch value={darkMode} onValueChange={toggleDarkMode} />
            </View>

             <View style={[styles.separator, { backgroundColor: theme.border }]} />

            {/* Notification Modal Link */}
            <TouchableOpacity style={styles.row} onPress={() => setNotifModalVisible(true)}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="notifications" size={22} color={theme.text} style={{marginRight: 10}} />
                <Text style={[styles.rowText, { color: theme.text }]}>{labels.notifications}</Text>
              </View>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <Text style={{color: theme.subText, marginRight: 5}}>
                   {notifEnabled ? (notifFreq === 'Daily' ? labels.daily : labels.weekly) : labels.off}
                 </Text>
                 <Ionicons name="chevron-forward" size={20} color={theme.subText} />
              </View>
            </TouchableOpacity>
          </View>
          
          {/* FAVORITES SECTION COMPLETELY REMOVED */}

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
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
              <Text style={{color: '#007AFF', fontSize: 17}}>{labels.cancel}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, {color: theme.text}]}>{labels.notifications}</Text>
            <TouchableOpacity onPress={saveNotificationSettings}>
              <Text style={{color: '#007AFF', fontSize: 17, fontWeight: 'bold'}}>{labels.done}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{padding: 20}}>
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <View style={styles.row}>
                <Text style={[styles.rowText, { color: theme.text }]}>{labels.allowNotif}</Text>
                <Switch value={notifEnabled} onValueChange={setNotifEnabled} />
              </View>
            </View>
            {notifEnabled && (
               <>
                <Text style={[styles.sectionTitle, { color: theme.subText, marginTop: 20 }]}>{labels.freq}</Text>
                <View style={[styles.card, { backgroundColor: theme.card }]}>
                  <TouchableOpacity style={styles.row} onPress={() => setNotifFreq('Daily')}>
                    <Text style={[styles.rowText, { color: theme.text }]}>{labels.daily}</Text>
                    {notifFreq === 'Daily' && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                  </TouchableOpacity>
                  <View style={[styles.separator, { backgroundColor: theme.border }]} />
                  <TouchableOpacity style={styles.row} onPress={() => setNotifFreq('Weekly')}>
                    <Text style={[styles.rowText, { color: theme.text }]}>{labels.weekly}</Text>
                    {notifFreq === 'Weekly' && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                  </TouchableOpacity>
                </View>
                <Text style={{color: theme.subText, marginTop: 10, fontSize: 13}}>
                   {labels.freqDesc}
                </Text>
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
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 10, marginLeft: 5 },
  card: { borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  rowText: { fontSize: 16 },
  separator: { height: 1, marginLeft: 50 },
  langBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5 },
  modalContainer: { flex: 1, paddingTop: Platform.OS === 'android' ? 20 : 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 0.5 },
  modalTitle: { fontSize: 17, fontWeight: '600' }
});