import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Switch,
  FlatList,
  Modal
} from 'react-native';
import {
  Send,
  Users,
  Search,
  History,
  Plus,
  X,
  Check,
  Smartphone,
  ChevronRight,
  Filter,
  CheckSquare,
  Square,
  FileText,
  Settings,
  MessageSquare,
  Building,
  User,
  ShieldCheck,
  Calendar,
  AlertCircle
} from 'lucide-react-native';
import axios from 'axios';
import { Colors } from '../constants/Colors';
import { useResponsive } from '../hooks/useResponsive';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Patient = {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  city?: string;
  gender?: string;
  blood_group?: string;
  age?: number;
};

type Template = {
  name: string;
  category: string;
  language: string;
  status: string;
  components: any;
};

type HistoryLog = {
  id: number;
  sender_name: string;
  sender_role: string;
  message_type: string;
  content: string;
  recipients_count: number;
  status: string;
  created_at: string;
};

interface CRMViewProps {
  userType: 'super_admin' | 'sub_admin' | 'employee';
}

export default function CRMView({ userType }: CRMViewProps) {
  const { isDesktop, isMobile, contentPadding } = useResponsive();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Tabs: 'campaign' | 'individual' | 'templates' | 'history'
  const [activeTab, setActiveTab] = useState<'campaign' | 'individual' | 'templates' | 'history'>('campaign');

  // Loading States
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  // Data States
  const [patients, setPatients] = useState<Patient[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [history, setHistory] = useState<HistoryLog[]>([]);

  // Filter States (Patients)
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [bloodFilter, setBloodFilter] = useState('all');

  // Filter Options from Backend
  const [uniqueCities, setUniqueCities] = useState<string[]>([]);
  const [uniqueGenders, setUniqueGenders] = useState<string[]>([]);
  const [uniqueBloodGroups, setUniqueBloodGroups] = useState<string[]>([]);

  // Selection & Composition State (Campaign)
  const [selectedPatients, setSelectedPatients] = useState<Record<string, Patient>>({});
  const [messageType, setMessageType] = useState<'text' | 'template'>('text');
  const [messageText, setMessageText] = useState('');
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [variableInputs, setVariableInputs] = useState<Record<string, string>>({});

  // Individual Messaging State
  const [indivSearchQuery, setIndivSearchQuery] = useState('');
  const [selectedIndivPatient, setSelectedIndivPatient] = useState<Patient | null>(null);
  const [indivMessageType, setIndivMessageType] = useState<'text' | 'template'>('text');
  const [indivMessageText, setIndivMessageText] = useState('');
  const [indivTemplateName, setIndivTemplateName] = useState('');
  const [indivVariableInputs, setIndivVariableInputs] = useState<Record<string, string>>({});

  // Template Creation State
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<'UTILITY' | 'MARKETING'>('UTILITY');
  const [newTemplateLanguage, setNewTemplateLanguage] = useState('en');
  const [newTemplateBody, setNewTemplateBody] = useState('');
  const [newTemplateHeader, setNewTemplateHeader] = useState('');
  const [newTemplateFooter, setNewTemplateFooter] = useState('');
  const [templateStatus, setTemplateStatus] = useState<string | null>(null);

  // DoubleTick Configuration Check
  const [dtConfig, setDtConfig] = useState<{ apiKey?: string; wabaNumber?: string } | null>(null);

  // Load user data on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        let storageKey = 'employeeUser';
        if (userType === 'super_admin') storageKey = 'superAdminUser';
        else if (userType === 'sub_admin') storageKey = 'subAdminUser';

        let userStr = Platform.OS === 'web' ? localStorage.getItem(storageKey) : await AsyncStorage.getItem(storageKey);
        if (userStr) {
          setCurrentUser(JSON.parse(userStr));
        }
      } catch (err) {
        console.error('Failed to load user', err);
      }
    };
    loadUser();
  }, [userType]);

  // Fetch Patients, Filter Options, and Config
  useEffect(() => {
    fetchPatients(currentPage);
  }, [currentPage, searchQuery, cityFilter, genderFilter, bloodFilter, activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, cityFilter, genderFilter, bloodFilter]);

  useEffect(() => {
    fetchFilterOptions();
    fetchDoubleTickConfig();
  }, []);

  // Individual Search Fetch with Debounce
  useEffect(() => {
    if (activeTab === 'individual' && indivSearchQuery.trim().length >= 2) {
      const delay = setTimeout(() => {
        fetchPatients(1);
      }, 300);
      return () => clearTimeout(delay);
    } else if (activeTab === 'individual' && !indivSearchQuery.trim()) {
      setPatients([]);
    }
  }, [indivSearchQuery, activeTab]);

  // Parse template placeholders when template is selected
  useEffect(() => {
    if (messageType === 'template' && selectedTemplateName) {
      const template = templates.find(t => t.name === selectedTemplateName);
      if (template) {
        const bodyComp = template.components?.find((c: any) => c.type === 'BODY');
        if (bodyComp && bodyComp.text) {
          // Find all occurrences of {{1}}, {{2}}, etc.
          const matches = bodyComp.text.match(/\{\{(\d+)\}\}/g) || [];
          // Deduplicate and strip braces
          const variableKeys = Array.from(new Set<string>(matches.map((m: any) => m.replace(/[\{\}]/g, ''))));
          setTemplateVariables(variableKeys);
          
          // Initialise input object
          const initialInputs: Record<string, string> = {};
          variableKeys.forEach((key: string) => {
            initialInputs[key] = '';
          });
          setVariableInputs(initialInputs);
        } else {
          setTemplateVariables([]);
        }
      }
    }
  }, [selectedTemplateName, messageType, templates]);

  useEffect(() => {
    if (indivMessageType === 'template' && indivTemplateName) {
      const template = templates.find(t => t.name === indivTemplateName);
      if (template) {
        const bodyComp = template.components?.find((c: any) => c.type === 'BODY');
        if (bodyComp && bodyComp.text) {
          const matches = bodyComp.text.match(/\{\{(\d+)\}\}/g) || [];
          const variableKeys = Array.from(new Set<string>(matches.map((m: any) => m.replace(/[\{\}]/g, ''))));
          const initialInputs: Record<string, string> = {};
          variableKeys.forEach((key: string) => {
            initialInputs[key] = '';
          });
          setIndivVariableInputs(initialInputs);
        }
      }
    }
  }, [indivTemplateName, indivMessageType, templates]);

  const fetchDoubleTickConfig = async () => {
    try {
      const res = await axios.get(`${API_URL}/settings`);
      if (res.data.success && res.data.settings.doubletick_config) {
        let value = res.data.settings.doubletick_config;
        if (typeof value === 'string') value = JSON.parse(value);
        setDtConfig(value);
      }
    } catch (err) {
      console.error('Failed to load DoubleTick config', err);
    }
  };

  const fetchPatients = async (page: number = 1) => {
    setLoadingPatients(true);
    try {
      const params: any = {
        page,
        limit: activeTab === 'individual' ? 10 : 15
      };
      
      if (activeTab === 'individual') {
        if (!indivSearchQuery.trim()) {
          setPatients([]);
          setLoadingPatients(false);
          return;
        }
        params.search = indivSearchQuery.trim();
      } else {
        if (searchQuery) params.search = searchQuery;
        if (cityFilter !== 'all') params.city = cityFilter;
        if (genderFilter !== 'all') params.gender = genderFilter;
        if (bloodFilter !== 'all') params.bloodGroup = bloodFilter;
      }

      const res = await axios.get(`${API_URL}/crm/patients`, { params });
      if (res.data.success) {
        setPatients(res.data.data || []);
        if (activeTab !== 'individual') {
          setCurrentPage(res.data.page || 1);
          setTotalPages(Math.ceil((res.data.total || 0) / (res.data.limit || 15)) || 1);
          setTotalPatients(res.data.total || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch patients', err);
    } finally {
      setLoadingPatients(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const res = await axios.get(`${API_URL}/crm/filters`);
      if (res.data.success) {
        setUniqueCities(res.data.cities || []);
        setUniqueGenders(res.data.genders || []);
        setUniqueBloodGroups(res.data.bloodGroups || []);
      }
    } catch (err) {
      console.error('Failed to fetch filter options', err);
    }
  };

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await axios.get(`${API_URL}/crm/templates`);
      if (res.data.success) {
        setTemplates(res.data.templates || []);
      } else {
        setTemplates([]);
      }
    } catch (err) {
      console.error('Failed to fetch templates', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API_URL}/crm/history`);
      if (res.data.success) {
        setHistory(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch campaign history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Toggle Patient Selection
  const toggleSelectPatient = (patient: Patient) => {
    setSelectedPatients(prev => {
      const updated = { ...prev };
      if (updated[patient.id]) {
        delete updated[patient.id];
      } else {
        updated[patient.id] = patient;
      }
      return updated;
    });
  };

  const selectAllPatients = () => {
    setSelectedPatients(prev => {
      const updated = { ...prev };
      const allSelectedOnPage = patients.length > 0 && patients.every(p => updated[p.id] !== undefined);
      if (allSelectedOnPage) {
        patients.forEach(p => delete updated[p.id]);
      } else {
        patients.forEach(p => { updated[p.id] = p; });
      }
      return updated;
    });
  };

  // Compose & Send Message
  const handleSendCampaign = async () => {
    const selectedCount = Object.keys(selectedPatients).length;
    if (selectedCount === 0) {
      Alert.alert('Error', 'Please select at least one recipient.');
      return;
    }

    if (messageType === 'text' && !messageText.trim()) {
      Alert.alert('Error', 'Please enter your message text.');
      return;
    }

    if (messageType === 'template' && !selectedTemplateName) {
      Alert.alert('Error', 'Please select a WhatsApp template.');
      return;
    }

    // Check if variables are filled
    if (messageType === 'template') {
      const missingVar = templateVariables.find(v => !variableInputs[v]?.trim());
      if (missingVar) {
        Alert.alert('Error', `Please fill in all template variables (variable {{${missingVar}}} is empty).`);
        return;
      }
    }

    setSending(true);

    const recipientMobiles = Object.values(selectedPatients).map(p => p.mobile);

    // Dynamic sender details
    const senderId = currentUser?.id?.toString() || 'admin';
    const senderName = currentUser?.full_name || currentUser?.name || 'Super Admin';
    const senderRole = userType;

    const payload = {
      messageType,
      recipients: recipientMobiles,
      messageText,
      templateName: selectedTemplateName,
      templateData: variableInputs,
      senderId,
      senderName,
      senderRole
    };

    try {
      const res = await axios.post(`${API_URL}/crm/send-message`, payload);
      if (res.data.success) {
        Alert.alert('Success', `Broadcast sent successfully to ${res.data.successCount} recipients.`);
        setSelectedPatients({});
        setMessageText('');
        setVariableInputs({});
        setSelectedTemplateName('');
      } else {
        const errorMsg = res.data.errors?.join(', ') || '';
        if (errorMsg.toLowerCase().includes('chat window is closed') || errorMsg.toLowerCase().includes('closed window')) {
          Alert.alert(
            'Chat Window Closed (Use Templates)',
            'WhatsApp session windows have closed for these customers. To message them in bulk, you must use an Approved Template message instead of a plain text message.'
          );
        } else {
          Alert.alert('Partial Send', `Completed with some issues. Success: ${res.data.successCount}, Failures: ${res.data.failureCount}. Errors: ${errorMsg}`);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send campaign');
    } finally {
      setSending(false);
    }
  };

  // Send Individual Message
  const handleSendIndividual = async () => {
    if (!selectedIndivPatient) {
      Alert.alert('Error', 'Please select a customer to message.');
      return;
    }

    if (indivMessageType === 'text' && !indivMessageText.trim()) {
      Alert.alert('Error', 'Please enter your message.');
      return;
    }

    if (indivMessageType === 'template' && !indivTemplateName) {
      Alert.alert('Error', 'Please select a template.');
      return;
    }

    setSending(true);

    const senderId = currentUser?.id?.toString() || 'admin';
    const senderName = currentUser?.full_name || currentUser?.name || 'Super Admin';
    const senderRole = userType;

    const payload = {
      messageType: indivMessageType,
      recipients: [selectedIndivPatient.mobile],
      messageText: indivMessageText,
      templateName: indivTemplateName,
      templateData: indivVariableInputs,
      senderId,
      senderName,
      senderRole
    };

    try {
      const res = await axios.post(`${API_URL}/crm/send-message`, payload);
      if (res.data.success) {
        Alert.alert('Success', `Message sent successfully to ${selectedIndivPatient.name}.`);
        setIndivMessageText('');
        setIndivVariableInputs({});
        setIndivTemplateName('');
        setSelectedIndivPatient(null);
        setIndivSearchQuery('');
      } else {
        const errorMsg = res.data.errors?.join(', ') || '';
        if (errorMsg.toLowerCase().includes('chat window is closed') || errorMsg.toLowerCase().includes('closed window')) {
          Alert.alert(
            'Chat Window Closed',
            'WhatsApp session window has closed for this customer. To message them, you must use an Approved Template message instead of a plain text message.'
          );
        } else {
          Alert.alert('Error', `Failed to send message: ${errorMsg}`);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Submit Template Creation
  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      Alert.alert('Error', 'Template name is required.');
      return;
    }
    if (!newTemplateBody.trim()) {
      Alert.alert('Error', 'Template body text is required.');
      return;
    }

    setCreatingTemplate(true);

    // Format components structure for DoubleTick endpoint
    const components: any = {
      body: {
        text: newTemplateBody
      }
    };

    if (newTemplateHeader.trim()) {
      components.header = {
        format: 'TEXT',
        text: newTemplateHeader
      };
    }

    if (newTemplateFooter.trim()) {
      components.footer = {
        text: newTemplateFooter
      };
    }

    const payload = {
      name: newTemplateName.toLowerCase().replace(/[^a-z0-9_]/g, '_'), // DoubleTick names must be lowercase snake_case
      category: newTemplateCategory,
      language: newTemplateLanguage,
      allowCategoryUpdate: true,
      components
    };

    try {
      const res = await axios.post(`${API_URL}/crm/templates`, payload);
      if (res.data.success) {
        setTemplateStatus('Template submitted for approval successfully!');
        setNewTemplateName('');
        setNewTemplateBody('');
        setNewTemplateHeader('');
        setNewTemplateFooter('');
        fetchTemplates(); // Refresh template list
      } else {
        setTemplateStatus(`Error: ${res.data.message || 'Failed to submit template.'}`);
      }
    } catch (err: any) {
      setTemplateStatus(`Error: ${err.response?.data?.message || 'Failed to submit template.'}`);
    } finally {
      setCreatingTemplate(false);
    }
  };

  // Rendering Layout Helpers

  return (
    <View style={styles.mainContainer}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MessageSquare size={22} color={Colors.light.primary} />
          <Text style={styles.headerTitle}>WhatsApp CRM Portal</Text>
        </View>

        {/* Configuration Status Indicators (Inline) */}
        <View style={styles.configRowInline}>
          <Text style={styles.configLabelInline}>WABA:</Text>
          <Text style={[styles.configValInline, dtConfig?.wabaNumber ? styles.configValActive : styles.configValInactive]}>
            {dtConfig?.wabaNumber ? ` +${dtConfig.wabaNumber}` : ' Not Configured'}
          </Text>
          <Text style={styles.configDivider}>|</Text>
          <Text style={styles.configLabelInline}>API Key:</Text>
          <Text style={[styles.configValInline, dtConfig?.apiKey ? styles.configValActive : styles.configValInactive]}>
            {dtConfig?.apiKey ? ' Connected' : ' Disconnected'}
          </Text>
        </View>
      </View>

      {/* Tabs Menu */}
      <View style={[styles.tabBar, { marginBottom: 12 }]}>
        <Pressable
          style={[styles.tabButton, activeTab === 'campaign' && styles.tabButtonActive]}
          onPress={() => setActiveTab('campaign')}
        >
          <Users size={18} color={activeTab === 'campaign' ? Colors.light.primary : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'campaign' && styles.tabTextActive]}>Bulk Campaign</Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'individual' && styles.tabButtonActive]}
          onPress={() => setActiveTab('individual')}
        >
          <Smartphone size={18} color={activeTab === 'individual' ? Colors.light.primary : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'individual' && styles.tabTextActive]}>Individual Message</Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'templates' && styles.tabButtonActive]}
          onPress={() => setActiveTab('templates')}
        >
          <FileText size={18} color={activeTab === 'templates' ? Colors.light.primary : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'templates' && styles.tabTextActive]}>Manage Templates</Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
          onPress={() => setActiveTab('history')}
        >
          <History size={18} color={activeTab === 'history' ? Colors.light.primary : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Sent History</Text>
        </Pressable>
      </View>

      {/* Tab Screen Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!dtConfig?.apiKey && (
          <View style={[styles.alertBanner, { marginBottom: 12, paddingVertical: 8 }]}>
            <AlertCircle size={20} color="#b45309" style={{ marginRight: 12 }} />
            <Text style={styles.alertText}>
              Warning: DoubleTick is not configured. Please go to Admin Settings to set up your API Key and WABA Sender Number.
            </Text>
          </View>
        )}

        {/* Tab 1: Campaign Manager (Bulk Messaging) */}
        {activeTab === 'campaign' && (
          <View style={[styles.tabContent, isDesktop && styles.desktopRow]}>
            {/* Left Column: Recipient Selection */}
            <View style={[styles.columnCard, isDesktop && { flex: 1.5, marginRight: 20 }]}>
              <Text style={styles.cardHeader}>Select Target Audience ({totalPatients} matching)</Text>
              
              {/* Audience Filters */}
              <View style={styles.filterSection}>
                <View style={styles.searchInputWrapper}>
                  <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.textInputSearch}
                    placeholder="Search by name, phone..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                {/* Filter Grid */}
                <View style={styles.filterGrid}>
                  <View style={styles.filterItem}>
                    <Text style={styles.filterLabel}>City</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
                      <Pressable
                        style={[styles.chip, cityFilter === 'all' && styles.chipActive]}
                        onPress={() => setCityFilter('all')}
                      >
                        <Text style={[styles.chipText, cityFilter === 'all' && styles.chipTextActive]}>All</Text>
                      </Pressable>
                      {uniqueCities.map(city => (
                        <Pressable
                          key={city}
                          style={[styles.chip, cityFilter === city && styles.chipActive]}
                          onPress={() => setCityFilter(city)}
                        >
                          <Text style={[styles.chipText, cityFilter === city && styles.chipTextActive]}>{city}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </View>

              {/* Patient Selection List */}
              <View style={styles.actionRow}>
                <Pressable style={styles.selectBtn} onPress={selectAllPatients}>
                  <Text style={styles.selectBtnText}>
                    {patients.length > 0 && patients.every(p => selectedPatients[p.id] !== undefined) ? 'Deselect Page' : 'Select Page'}
                  </Text>
                </Pressable>
                <Text style={styles.selectedCountText}>{Object.keys(selectedPatients).length} selected</Text>
              </View>

              {loadingPatients ? (
                <ActivityIndicator size="large" color={Colors.light.primary} style={{ margin: 30 }} />
              ) : (
                <View style={styles.listContainer}>
                  {patients.map(item => {
                    const isSelected = selectedPatients[item.id] !== undefined;
                    return (
                      <Pressable
                        key={item.id}
                        style={[styles.patientRow, isSelected && styles.patientRowSelected]}
                        onPress={() => toggleSelectPatient(item)}
                      >
                        {isSelected ? (
                          <CheckSquare size={20} color={Colors.light.primary} />
                        ) : (
                          <Square size={20} color="#cbd5e1" />
                        )}
                        <View style={{ marginLeft: 12, flex: 1 }}>
                          <Text style={styles.patientName}>{item.name}</Text>
                          <Text style={styles.patientMobile}>
                            {item.mobile} • {item.city || 'No City'}
                          </Text>
                        </View>
                        {item.blood_group && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{item.blood_group}</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                  {patients.length === 0 && (
                    <Text style={styles.emptyText}>No customers match current filters.</Text>
                  )}
                </View>
              )}

              {/* Pagination Controls */}
              {activeTab === 'campaign' && totalPages > 1 && (
                <View style={styles.paginationRow}>
                  <Pressable
                    style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <Text style={[styles.pageBtnText, currentPage === 1 && styles.pageBtnTextDisabled]}>Prev</Text>
                  </Pressable>
                  <Text style={styles.pageInfoText}>
                    Page {currentPage} of {totalPages} ({totalPatients} total)
                  </Text>
                  <Pressable
                    style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    <Text style={[styles.pageBtnText, currentPage === totalPages && styles.pageBtnTextDisabled]}>Next</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Right Column: Message Composer */}
            <View style={[styles.columnCard, isDesktop && { flex: 1 }]}>
              <Text style={styles.cardHeader}>Compose WhatsApp Message</Text>

              {/* Message Type Toggle */}
              <View style={styles.toggleRow}>
                <Pressable
                  style={[styles.toggleBtn, messageType === 'text' && styles.toggleBtnActive]}
                  onPress={() => setMessageType('text')}
                >
                  <Text style={[styles.toggleBtnText, messageType === 'text' && styles.toggleBtnTextActive]}>
                    Plain Text
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.toggleBtn, messageType === 'template' && styles.toggleBtnActive]}
                  onPress={() => {
                    setMessageType('template');
                    fetchTemplates();
                  }}
                >
                  <Text style={[styles.toggleBtnText, messageType === 'template' && styles.toggleBtnTextActive]}>
                    Approved Template
                  </Text>
                </Pressable>
              </View>

              {messageType === 'text' ? (
                <View>
                  <Text style={styles.composerLabel}>Message Content</Text>
                  <TextInput
                    style={styles.messageTextInput}
                    placeholder="Enter your message here..."
                    multiline
                    numberOfLines={6}
                    value={messageText}
                    onChangeText={setMessageText}
                  />
                  <Text style={styles.composerHint}>
                    Note: Direct text messages can only be sent if the customer has interacted with your business within the last 24 hours. Use templates for bulk greetings and offers!
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.composerLabel}>Select Template</Text>
                  <ScrollView style={styles.templatePicker} nestedScrollEnabled>
                    {templates.map(t => (
                      <Pressable
                        key={t.name}
                        style={[
                          styles.templatePickerItem,
                          selectedTemplateName === t.name && styles.templatePickerItemActive
                        ]}
                        onPress={() => setSelectedTemplateName(t.name)}
                      >
                        <Text
                          style={[
                            styles.templatePickerText,
                            selectedTemplateName === t.name && styles.templatePickerTextActive
                          ]}
                        >
                          {t.name} ({t.category})
                        </Text>
                      </Pressable>
                    ))}
                    {templates.length === 0 && (
                      <Text style={styles.emptyText}>No approved templates found in DoubleTick.</Text>
                    )}
                  </ScrollView>

                  {/* Template Variable Placeholder Fields */}
                  {templateVariables.length > 0 && (
                    <View style={styles.variablesBox}>
                      <Text style={styles.composerLabel}>Template Placeholders</Text>
                      <Text style={styles.composerHint}>Meta templates require you to specify variables:</Text>
                      {templateVariables.map(variable => (
                        <View key={variable} style={styles.variableRow}>
                          <Text style={styles.variableLabel}>Placeholer {"{{" + variable + "}}"}</Text>
                          <TextInput
                            style={styles.variableInput}
                            placeholder={`Enter value for {{${variable}}}`}
                            value={variableInputs[variable]}
                            onChangeText={val =>
                              setVariableInputs(prev => ({ ...prev, [variable]: val }))
                            }
                          />
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              <Pressable
                style={[styles.sendBtn, (sending || Object.keys(selectedPatients).length === 0) && styles.sendBtnDisabled]}
                onPress={handleSendCampaign}
                disabled={sending || Object.keys(selectedPatients).length === 0}
              >
                {sending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Send size={18} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.sendBtnText}>
                      Send WhatsApp Campaign ({Object.keys(selectedPatients).length})
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Tab 2: Individual Messages */}
        {activeTab === 'individual' && (
          <View style={styles.tabContent}>
            <View style={styles.columnCard}>
              <Text style={styles.cardHeader}>Send Individual Message (Order Updates / Service)</Text>

              {/* Search Customer */}
              <Text style={styles.composerLabel}>Search Customer by Name or Phone</Text>
              <View style={styles.searchInputWrapper}>
                <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInputSearch}
                  placeholder="Type to search..."
                  value={indivSearchQuery}
                  onChangeText={setIndivSearchQuery}
                />
              </View>

              {/* Dropdown Suggestions */}
              {indivSearchQuery && !selectedIndivPatient && (
                <View style={styles.indivDropdown}>
                  {patients.map(p => (
                    <Pressable
                      key={p.id}
                      style={styles.indivDropdownItem}
                      onPress={() => setSelectedIndivPatient(p)}
                    >
                      <User size={16} color="#64748b" style={{ marginRight: 8 }} />
                      <Text style={styles.indivDropdownText}>
                        {p.name} ({p.mobile})
                      </Text>
                    </Pressable>
                  ))}
                  {patients.length === 0 && (
                    <Text style={styles.emptyText}>No matching customers found.</Text>
                  )}
                </View>
              )}

              {/* Selected Customer Details */}
              {selectedIndivPatient && (
                <View style={styles.selectedCustomerCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <User size={24} color={Colors.light.primary} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.selectedCustomerName}>{selectedIndivPatient.name}</Text>
                        <Text style={styles.selectedCustomerMobile}>{selectedIndivPatient.mobile}</Text>
                      </View>
                    </View>
                    <Pressable onPress={() => setSelectedIndivPatient(null)}>
                      <X size={20} color="#64748b" />
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Composition for Individual */}
              {selectedIndivPatient && (
                <View style={{ marginTop: 20 }}>
                  <Text style={styles.composerLabel}>Message Type</Text>
                  <View style={styles.toggleRow}>
                    <Pressable
                      style={[styles.toggleBtn, indivMessageType === 'text' && styles.toggleBtnActive]}
                      onPress={() => setIndivMessageType('text')}
                    >
                      <Text style={[styles.toggleBtnText, indivMessageType === 'text' && styles.toggleBtnTextActive]}>
                        Plain Text Message
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.toggleBtn, indivMessageType === 'template' && styles.toggleBtnActive]}
                      onPress={() => {
                        setIndivMessageType('template');
                        fetchTemplates();
                      }}
                    >
                      <Text style={[styles.toggleBtnText, indivMessageType === 'template' && styles.toggleBtnTextActive]}>
                        Approved Template
                      </Text>
                    </Pressable>
                  </View>

                  {indivMessageType === 'text' ? (
                    <View>
                      <Text style={styles.composerLabel}>Message text</Text>
                      <TextInput
                        style={styles.messageTextInput}
                        placeholder="Write individual update (e.g. Your order is ready for dispatch)..."
                        multiline
                        numberOfLines={5}
                        value={indivMessageText}
                        onChangeText={setIndivMessageText}
                      />
                      <Text style={styles.composerHint}>
                        Note: Direct text messages can only be sent if the customer has interacted with your business within the last 24 hours. Use templates if the chat window is closed!
                      </Text>
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.composerLabel}>Select Template</Text>
                      <ScrollView style={styles.templatePicker} nestedScrollEnabled>
                        {templates.map(t => (
                          <Pressable
                            key={t.name}
                            style={[
                              styles.templatePickerItem,
                              indivTemplateName === t.name && styles.templatePickerItemActive
                            ]}
                            onPress={() => setIndivTemplateName(t.name)}
                          >
                            <Text
                              style={[
                                styles.templatePickerText,
                                indivTemplateName === t.name && styles.templatePickerTextActive
                              ]}
                            >
                              {t.name} ({t.category})
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>

                      {/* Dynamic Placeholder Form */}
                      {Object.keys(indivVariableInputs).length > 0 && (
                        <View style={styles.variablesBox}>
                          <Text style={styles.composerLabel}>Placeholders</Text>
                          {Object.keys(indivVariableInputs).map(variable => (
                            <View key={variable} style={styles.variableRow}>
                              <Text style={styles.variableLabel}>{"{{" + variable + "}}"}</Text>
                              <TextInput
                                style={styles.variableInput}
                                placeholder={`Enter value for placeholder`}
                                value={indivVariableInputs[variable]}
                                onChangeText={val =>
                                  setIndivVariableInputs(prev => ({ ...prev, [variable]: val }))
                                }
                              />
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  <Pressable
                    style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                    onPress={handleSendIndividual}
                    disabled={sending}
                  >
                    {sending ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Send size={18} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.sendBtnText}>Send Message</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Tab 3: Template Manager & Creation */}
        {activeTab === 'templates' && (
          <View style={[styles.tabContent, isDesktop && styles.desktopRow]}>
            {/* Create Template Form */}
            <View style={[styles.columnCard, isDesktop && { flex: 1, marginRight: 20 }]}>
              <Text style={styles.cardHeader}>Create New WhatsApp Template</Text>
              
              {templateStatus && (
                <View style={[
                  styles.inlineStatusBanner,
                  { backgroundColor: templateStatus.startsWith('Error') ? '#fee2e2' : '#dcfce7' }
                ]}>
                  <Text style={[
                    styles.inlineStatusText,
                    { color: templateStatus.startsWith('Error') ? '#ef4444' : '#15803d' }
                  ]}>
                    {templateStatus}
                  </Text>
                  <Pressable onPress={() => setTemplateStatus(null)} style={{ marginLeft: 8 }}>
                    <X size={16} color={templateStatus.startsWith('Error') ? '#ef4444' : '#15803d'} />
                  </Pressable>
                </View>
              )}

              <Text style={styles.composerHint}>
                Create marketing or utility templates and submit them to Meta for official approval.
              </Text>

              <Text style={styles.composerLabel}>Template Name (lowercase snake_case)</Text>
              <TextInput
                style={styles.simpleTextInput}
                placeholder="e.g. order_completed_notification"
                value={newTemplateName}
                onChangeText={setNewTemplateName}
              />

              <Text style={styles.composerLabel}>Category</Text>
              <View style={styles.toggleRow}>
                <Pressable
                  style={[styles.toggleBtn, newTemplateCategory === 'UTILITY' && styles.toggleBtnActive]}
                  onPress={() => setNewTemplateCategory('UTILITY')}
                >
                  <Text style={[styles.toggleBtnText, newTemplateCategory === 'UTILITY' && styles.toggleBtnTextActive]}>
                    Utility
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.toggleBtn, newTemplateCategory === 'MARKETING' && styles.toggleBtnActive]}
                  onPress={() => setNewTemplateCategory('MARKETING')}
                >
                  <Text style={[styles.toggleBtnText, newTemplateCategory === 'MARKETING' && styles.toggleBtnTextActive]}>
                    Marketing
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.composerLabel}>Header Text (Optional)</Text>
              <TextInput
                style={styles.simpleTextInput}
                placeholder="e.g. Bharat Medical Hall"
                value={newTemplateHeader}
                onChangeText={setNewTemplateHeader}
              />

              <Text style={styles.composerLabel}>Body Text (Required)</Text>
              <TextInput
                style={[styles.messageTextInput, { height: 100 }]}
                placeholder="Write your text body. Include placeholders like {{1}}, {{2}} for dynamic values."
                multiline
                numberOfLines={4}
                value={newTemplateBody}
                onChangeText={setNewTemplateBody}
              />

              <Text style={styles.composerLabel}>Footer Text (Optional)</Text>
              <TextInput
                style={styles.simpleTextInput}
                placeholder="e.g. Reply STOP to opt out"
                value={newTemplateFooter}
                onChangeText={setNewTemplateFooter}
              />

              <Pressable
                style={[styles.sendBtn, creatingTemplate && styles.sendBtnDisabled]}
                onPress={handleCreateTemplate}
                disabled={creatingTemplate}
              >
                {creatingTemplate ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Plus size={18} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.sendBtnText}>Submit Template to Meta</Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* List DoubleTick Templates */}
            <View style={[styles.columnCard, isDesktop && { flex: 1.2 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={[styles.cardHeader, { marginBottom: 0 }]}>Template List & Statuses</Text>
                <Pressable onPress={fetchTemplates} style={styles.refreshBtn}>
                  <Text style={styles.refreshBtnText}>Refresh</Text>
                </Pressable>
              </View>
              {loadingTemplates ? (
                <ActivityIndicator size="large" color={Colors.light.primary} style={{ margin: 20 }} />
              ) : (
                <View>
                  {templates.map(t => {
                    const statusColor = t.status === 'APPROVED' ? '#10b981' : t.status === 'PENDING' ? '#f59e0b' : '#ef4444';
                    return (
                      <View key={t.name} style={styles.templateItemCard}>
                        <View style={styles.templateCardHead}>
                          <Text style={styles.templateNameText}>{t.name}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                              {t.status}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.templateCategoryText}>
                          Category: {t.category} | Language: {t.language}
                        </Text>
                        
                        {/* Display message text components */}
                        <View style={styles.templateBodyPreview}>
                          {t.components?.map((c: any, index: number) => {
                            if (c.type === 'HEADER') {
                              return <Text key={index} style={styles.previewHeader}>{c.text}</Text>;
                            }
                            if (c.type === 'BODY') {
                              return <Text key={index} style={styles.previewBody}>{c.text}</Text>;
                            }
                            if (c.type === 'FOOTER') {
                              return <Text key={index} style={styles.previewFooter}>{c.text}</Text>;
                            }
                            return null;
                          })}
                        </View>
                      </View>
                    );
                  })}
                  {templates.length === 0 && (
                    <Text style={styles.emptyText}>No templates configured in DoubleTick.</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Tab 4: History log */}
        {activeTab === 'history' && (
          <View style={styles.tabContent}>
            <View style={styles.columnCard}>
              <Text style={styles.cardHeader}>WhatsApp Messaging Campaign Audit Logs</Text>
              {loadingHistory ? (
                <ActivityIndicator size="large" color={Colors.light.primary} style={{ margin: 20 }} />
              ) : (
                <View style={styles.historyList}>
                  {history.map(log => {
                    const statusColor = log.status === 'Sent' ? '#10b981' : log.status === 'Partial' ? '#f59e0b' : '#ef4444';
                    return (
                      <View key={log.id} style={styles.historyRow}>
                        <View style={styles.historyMeta}>
                          <View>
                            <Text style={styles.historySender}>
                              {log.sender_name} ({log.sender_role})
                            </Text>
                            <Text style={styles.historyDate}>
                              {new Date(log.created_at).toLocaleString()}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                                {log.status}
                              </Text>
                            </View>
                            <Text style={styles.historyCount}>
                              Recipients: {log.recipients_count}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.historyBody}>
                          <Text style={styles.historyBodyText}>{log.content}</Text>
                        </View>
                      </View>
                    );
                  })}
                  {history.length === 0 && (
                    <Text style={styles.emptyText}>No campaign history log exists.</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 10
  },
  headerRow: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginLeft: 8
  },
  configRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6
  },
  configLabelInline: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600'
  },
  configValInline: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  configDivider: {
    marginHorizontal: 8,
    color: '#cbd5e1'
  },
  configValActive: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: 'bold'
  },
  configValInactive: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: 'bold'
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    padding: 6,
    borderRadius: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 4
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minWidth: 120
  },
  tabButtonActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 8
  },
  tabTextActive: {
    color: Colors.light.primary
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40
  },
  alertBanner: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  alertText: {
    fontSize: 13,
    color: '#92400e',
    flex: 1
  },
  tabContent: {
    width: '100%'
  },
  desktopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  columnCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16
  },
  filterSection: {
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 12
  },
  textInputSearch: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    padding: 0,
    outlineStyle: 'none' as any
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  filterItem: {
    flex: 1,
    minWidth: 200
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6
  },
  chipsContainer: {
    flexDirection: 'row'
  },
  chip: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6
  },
  chipActive: {
    backgroundColor: '#dbeafe'
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569'
  },
  chipTextActive: {
    color: Colors.light.primary,
    fontWeight: 'bold'
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  selectBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  selectBtnText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600'
  },
  selectedCountText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500'
  },
  listContainer: {
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 12,
    maxHeight: 400,
    overflow: Platform.OS === 'web' ? 'auto' : 'scroll' as any
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  patientRowSelected: {
    backgroundColor: '#f8fafc'
  },
  patientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b'
  },
  patientMobile: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  badge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  badgeText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: 'bold'
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 4,
    borderRadius: 8,
    marginBottom: 16
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6
  },
  toggleBtnActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b'
  },
  toggleBtnTextActive: {
    color: Colors.light.primary
  },
  composerLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 12,
    marginBottom: 8
  },
  composerHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    lineHeight: 18
  },
  messageTextInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#334155',
    textAlignVertical: 'top',
    outlineStyle: 'none' as any
  },
  simpleTextInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#334155',
    marginBottom: 16,
    outlineStyle: 'none' as any
  },
  templatePicker: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    maxHeight: 200,
    marginBottom: 16
  },
  templatePickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  templatePickerItemActive: {
    backgroundColor: '#eff6ff'
  },
  templatePickerText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500'
  },
  templatePickerTextActive: {
    color: Colors.light.primary,
    fontWeight: 'bold'
  },
  variablesBox: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 12,
    marginBottom: 16
  },
  variableRow: {
    marginBottom: 12
  },
  variableLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4
  },
  variableInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 36,
    backgroundColor: 'white',
    fontSize: 13,
    color: '#334155',
    outlineStyle: 'none' as any
  },
  sendBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.light.primary,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16
  },
  sendBtnDisabled: {
    backgroundColor: '#93c5fd'
  },
  sendBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: 24,
    fontSize: 13
  },
  indivDropdown: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 16,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10
  },
  indivDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  indivDropdownText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500'
  },
  selectedCustomerCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  selectedCustomerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e3a8a'
  },
  selectedCustomerMobile: {
    fontSize: 13,
    color: '#3b82f6',
    marginTop: 2
  },
  templateItemCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#fafbfc'
  },
  templateCardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  templateNameText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold'
  },
  templateCategoryText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6
  },
  templateBodyPreview: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 12,
    marginTop: 12
  },
  previewHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4
  },
  previewBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18
  },
  previewFooter: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4
  },
  historyList: {
    gap: 16
  },
  historyRow: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'white'
  },
  historyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
    marginBottom: 10
  },
  historySender: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#334155'
  },
  historyDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2
  },
  historyCount: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500'
  },
  historyBody: {
    paddingTop: 4
  },
  historyBodyText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18
  },
  refreshBtn: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  refreshBtnText: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: 'bold'
  },
  inlineStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16
  },
  inlineStatusText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 12
  },
  pageBtn: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  pageBtnDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0'
  },
  pageBtnText: {
    fontSize: 13,
    color: Colors.light.primary,
    fontWeight: 'bold'
  },
  pageBtnTextDisabled: {
    color: '#cbd5e1'
  },
  pageInfoText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500'
  }
});
