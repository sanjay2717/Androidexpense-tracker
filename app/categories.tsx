import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PersonOutlineIcon,
  CategoryIcon,
  PlusIcon,
  CloseIcon,
  CheckIcon,
  TrashIcon,
  PencilIcon,
} from '../src/components/Icons';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useTransactions,
} from '../src/lib/api';
import { safeBack } from '../src/lib/nav';
import { supabase } from '../src/lib/supabase';
import { theme } from '../src/theme';
import { Category, TransactionType } from '../src/types/database';
import { AppHeader, HeaderActionButton } from '../src/components/AppHeader';

interface IconChoice {
  key: string;
  label: string;
}

const AVAILABLE_ICONS: IconChoice[] = [
  { key: 'restaurant', label: 'Restaurant' },
  { key: 'shopping_cart', label: 'Shopping' },
  { key: 'directions_car', label: 'Transit' },
  { key: 'home', label: 'Housing' },
  { key: 'local_cafe', label: 'Coffee' },
  { key: 'gift', label: 'Gifts' },
  { key: 'sports_esports', label: 'Gaming' },
  { key: 'cardiology', label: 'Health' },
  { key: 'flight', label: 'Travel' },
  { key: 'fitness_center', label: 'Fitness' },
  { key: 'menu_book', label: 'Books' },
  { key: 'headphones', label: 'Music' },
  { key: 'pets', label: 'Pets' },
  { key: 'wifi', label: 'Utilities' },
  { key: 'sports_bar', label: 'Nightlife' },
  { key: 'photo_camera', label: 'Camera' },
  { key: 'local_gas_station', label: 'Gas & Fuel' },
  { key: 'credit_card', label: 'Banking' },
  { key: 'apparel', label: 'Apparel' },
  { key: 'theaters', label: 'Movies' },
];

interface ColorChoice {
  colorHex: string;
  label: string;
}

const AVAILABLE_COLORS: ColorChoice[] = [
  { colorHex: theme.colors.primary, label: 'Putu Pink' },
  { colorHex: theme.colors.primaryDark, label: 'Deep Berry' },
  { colorHex: theme.colors.rose, label: 'Rose Red' },
  { colorHex: theme.colors.warning, label: 'Orange' },
  { colorHex: theme.colors.amber, label: 'Amber' },
  { colorHex: theme.colors.emerald, label: 'Emerald' },
  { colorHex: theme.colors.tertiary, label: 'Indigo' },
  { colorHex: theme.colors.blue, label: 'Ocean Blue' },
  { colorHex: theme.colors.slate, label: 'Slate' },
  { colorHex: theme.colors.primaryContainer, label: 'Magenta' },
];

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const { data: categories = [], isLoading } = useCategories();
  const { data: transactions = [] } = useTransactions();

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [activeTab, setActiveTab] = useState<TransactionType>('expense');

  // Sheet State
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null); // null = add mode
  const [nameInput, setNameInput] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('restaurant');
  const [selectedColor, setSelectedColor] = useState<string>(theme.colors.primary);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Map transaction counts by category_id
  const txCountMap = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.category_id) {
        counts[tx.category_id] = (counts[tx.category_id] || 0) + 1;
      }
    }
    return counts;
  }, [transactions]);

  // Filtered categories for the active tab
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const catType = (cat.type || 'expense').toLowerCase();
      return catType === activeTab;
    });
  }, [categories, activeTab]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    safeBack('/settings');
  };

  const handleTabChange = (tab: TransactionType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const handleOpenAddSheet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingCategory(null);
    setNameInput('');
    setSelectedIcon(activeTab === 'income' ? 'credit_card' : 'restaurant');
    setSelectedColor(activeTab === 'income' ? theme.colors.emerald : theme.colors.primary);
    setValidationError(null);
    setSheetVisible(true);
  };

  const handleOpenEditSheet = (category: Category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingCategory(category);
    setNameInput(category.name || '');
    setSelectedIcon(category.icon || 'restaurant');
    setSelectedColor(category.color || theme.colors.primary);
    setValidationError(null);
    setSheetVisible(true);
  };

  const handleCloseSheet = () => {
    setSheetVisible(false);
    setEditingCategory(null);
    setValidationError(null);
  };

  const handleSaveCategory = async () => {
    const trimmed = nameInput.trim();

    // 1. Required name check
    if (!trimmed) {
      setValidationError('Category name is required.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // 2. Client-side uniqueness check within its type
    const isDuplicate = categories.some((c) => {
      const sameType = (c.type || 'expense').toLowerCase() === activeTab;
      const isOther = editingCategory ? c.id !== editingCategory.id : true;
      return sameType && isOther && c.name.trim().toLowerCase() === trimmed.toLowerCase();
    });

    if (isDuplicate) {
      setValidationError(`A category named "${trimmed}" already exists in ${activeTab}.`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setValidationError(null);

    try {
      if (editingCategory) {
        // Edit mode (leaves budget_limit untouched)
        await updateMutation.mutateAsync({
          id: editingCategory.id,
          name: trimmed,
          type: activeTab,
          color: selectedColor,
          icon: selectedIcon,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Add mode
        await createMutation.mutateAsync({
          name: trimmed,
          type: activeTab,
          color: selectedColor,
          icon: selectedIcon,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      handleCloseSheet();
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Unable to save category.');
    }
  };

  const handleDeleteCategory = async () => {
    if (!editingCategory) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    try {
      setIsDeleting(true);
      // Query exact transaction count for this category
      const { count } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', editingCategory.id);

      setIsDeleting(false);

      const txCount = count ?? 0;
      const message =
        txCount > 0
          ? `${txCount} transaction${txCount === 1 ? '' : 's'} will become Uncategorized.`
          : 'Are you sure you want to delete this category?';

      Alert.alert('Delete Category?', message, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteMutation.mutateAsync(editingCategory.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              handleCloseSheet();
            } catch (delErr: any) {
              Alert.alert('Delete Failed', delErr.message || 'Unable to delete category.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]);
    } catch (err: any) {
      setIsDeleting(false);
      Alert.alert('Error', err.message || 'Failed to check category transactions.');
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending || isDeleting;
  const currentIconLabel =
    AVAILABLE_ICONS.find((i) => i.key === selectedIcon)?.label || 'Icon';
  const currentColorLabel =
    AVAILABLE_COLORS.find((c) => c.colorHex === selectedColor)?.label || 'Color';

  return (
    <View style={styles.screen}>
      {/* Universal Inset AppHeader (Stack variant, left title, pink plus in rightExtra) */}
      <AppHeader
        variant="stack"
        title="Categories"
        rightExtra={
          <HeaderActionButton
            onPress={handleOpenAddSheet}
            accessibilityLabel="Add category"
            variant="primary"
            icon={<PlusIcon size={20} color={theme.colors.white} />}
          />
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90, paddingTop: 10 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* Segmented Control (Expense | Income) */}
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[
              styles.segmentTab,
              activeTab === 'expense' && styles.segmentTabActive,
            ]}
            onPress={() => handleTabChange('expense')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentTabText,
                activeTab === 'expense' && styles.segmentTabTextActive,
              ]}
            >
              Expense
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentTab,
              activeTab === 'income' && styles.segmentTabActive,
            ]}
            onPress={() => handleTabChange('income')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentTabText,
                activeTab === 'income' && styles.segmentTabTextActive,
              ]}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderLabel}>
            {activeTab === 'expense' ? 'EXPENSE CATEGORIES' : 'INCOME CATEGORIES'} (
            {filteredCategories.length})
          </Text>
          <Text style={styles.sectionHeaderSub}>Customized</Text>
        </View>

        {/* Grouped Inset Card */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : filteredCategories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No {activeTab} categories yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the button below to add your first custom {activeTab} category.
            </Text>
          </View>
        ) : (
          <View style={styles.cardGroup}>
            {filteredCategories.map((category, index) => {
              const txCount = txCountMap[category.id] || 0;
              const catColor = category.color || theme.colors.primary;

              return (
                <React.Fragment key={category.id}>
                  {index > 0 && <View style={styles.hairlineDivider} />}
                  <TouchableOpacity
                    style={styles.categoryRow}
                    onPress={() => handleOpenEditSheet(category)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.iconBadge,
                        { backgroundColor: catColor + '18' },
                      ]}
                    >
                      <CategoryIcon
                        name={category.icon || category.name}
                        color={catColor}
                        size={20}
                      />
                    </View>

                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName} numberOfLines={1}>
                        {category.name}
                      </Text>
                      <Text style={styles.categorySub} numberOfLines={1}>
                        {txCount > 0
                          ? `${txCount} transaction${txCount === 1 ? '' : 's'}`
                          : 'No transactions'}
                      </Text>
                    </View>

                    <View style={styles.categoryRight}>
                      <ChevronRightIcon size={18} color={theme.colors.outlineVariant} />
                    </View>
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Add Category Button */}
      <View style={[styles.bottomButtonContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleOpenAddSheet}
          activeOpacity={0.85}
        >
          <PlusIcon size={20} color={theme.colors.white} />
          <Text style={styles.addButtonText}>Add Category</Text>
        </TouchableOpacity>
      </View>

      {/* Edit / Add Category Bottom Sheet Modal */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseSheet}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleCloseSheet}
          />

          <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            {/* Sheet Handle */}
            <View style={styles.handleContainer}>
              <View style={styles.handleBar} />
            </View>

            {/* Sheet Title Bar */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseSheet}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <CloseIcon size={18} color={theme.colors.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Live Preview Hero Badge */}
              <View style={styles.previewHero}>
                <View
                  style={[
                    styles.previewBadge,
                    { backgroundColor: selectedColor },
                  ]}
                >
                  <CategoryIcon
                    name={selectedIcon}
                    color={theme.colors.white}
                    size={30}
                  />
                  <View style={styles.previewEditIndicator}>
                    <PencilIcon size={12} color={theme.colors.primary} />
                  </View>
                </View>
                <Text style={styles.previewName} numberOfLines={1}>
                  {nameInput.trim() || 'Untitled Category'}
                </Text>
                <Text style={styles.previewType}>
                  {activeTab === 'expense' ? 'Expense Category' : 'Income Category'}
                </Text>
              </View>

              {/* Category Name Input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>CATEGORY NAME</Text>
                <View
                  style={[
                    styles.inputContainer,
                    validationError ? styles.inputErrorBorder : null,
                  ]}
                >
                  <TextInput
                    style={styles.textInput}
                    value={nameInput}
                    onChangeText={(val) => {
                      setNameInput(val);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="Enter category name"
                    placeholderTextColor={theme.colors.secondary + '80'}
                    autoFocus={!editingCategory}
                    maxLength={32}
                  />
                  {nameInput.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearInputButton}
                      onPress={() => setNameInput('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <CloseIcon size={14} color={theme.colors.secondary} />
                    </TouchableOpacity>
                  )}
                </View>
                {validationError && (
                  <Text style={styles.errorText}>{validationError}</Text>
                )}
              </View>

              {/* Icon Selection Grid */}
              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>SELECT ICON</Text>
                  <Text style={styles.fieldLabelActive}>{currentIconLabel}</Text>
                </View>

                <View style={styles.iconGrid}>
                  {AVAILABLE_ICONS.map((item) => {
                    const isSelected = selectedIcon === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[
                          styles.iconCell,
                          isSelected && styles.iconCellSelected,
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedIcon(item.key);
                        }}
                        activeOpacity={0.7}
                      >
                        <CategoryIcon
                          name={item.key}
                          color={isSelected ? theme.colors.primary : theme.colors.secondary}
                          size={22}
                        />
                        {isSelected && (
                          <View style={styles.cellCheckBadge}>
                            <CheckIcon size={10} color={theme.colors.white} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Color Swatches */}
              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>SELECT COLOR</Text>
                  <Text style={styles.fieldLabelActive}>{currentColorLabel}</Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.colorSwatchesContainer}
                >
                  {AVAILABLE_COLORS.map((item) => {
                    const isSelected = selectedColor === item.colorHex;
                    return (
                      <TouchableOpacity
                        key={item.colorHex}
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: item.colorHex },
                          isSelected && styles.colorSwatchSelected,
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedColor(item.colorHex);
                        }}
                        activeOpacity={0.8}
                      >
                        {isSelected && <CheckIcon size={14} color={theme.colors.white} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    isSubmitting && styles.buttonDisabled,
                  ]}
                  onPress={handleSaveCategory}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={theme.colors.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {editingCategory ? 'Save Changes' : 'Create Category'}
                    </Text>
                  )}
                </TouchableOpacity>

                {editingCategory && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDeleteCategory}
                    disabled={isSubmitting}
                    activeOpacity={0.7}
                  >
                    <TrashIcon size={18} color={theme.colors.error} />
                    <Text style={styles.deleteButtonText}>Delete Category</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  headerBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.margin,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.primary,
    marginLeft: 2,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  headerRight: {
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.margin,
    paddingTop: theme.spacing.xs,
  },
  largeTitleContainer: {
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
  },
  subtitleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.secondary,
    letterSpacing: 0.8,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.onSurface,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.secondaryContainer,
    borderRadius: theme.radii.input,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.sm,
  },
  segmentTabActive: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    ...theme.shadows.card,
  },
  segmentTabText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.secondary,
  },
  segmentTabTextActive: {
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: theme.spacing.xs,
  },
  sectionHeaderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.secondary,
    letterSpacing: 0.8,
  },
  sectionHeaderSub: {
    fontSize: 13,
    color: theme.colors.secondary,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    ...theme.shadows.card,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.secondary,
    textAlign: 'center',
    marginTop: 6,
  },
  cardGroup: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 58,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  categoryInfo: {
    flex: 1,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  categorySub: {
    fontSize: 13,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hairlineDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.hairline,
    marginLeft: 70,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.margin,
    backgroundColor: 'transparent',
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    height: 52,
    borderRadius: theme.radii.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...theme.shadows.card,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.white,
  },
  // Modal Bottom Sheet Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheetContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    ...theme.shadows.card,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.secondaryContainer,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  previewHero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  previewBadge: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  previewEditIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginTop: 8,
    textAlign: 'center',
  },
  previewType: {
    fontSize: 13,
    color: theme.colors.secondary,
    marginTop: 2,
  },
  fieldGroup: {
    marginTop: 16,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.secondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  fieldLabelActive: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.radii.input,
    paddingHorizontal: 14,
    height: 48,
  },
  inputErrorBorder: {
    borderWidth: 1.5,
    borderColor: theme.colors.error,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  clearInputButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: 12,
    ...theme.shadows.card,
  },
  iconCell: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: theme.radii.input,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconCellSelected: {
    backgroundColor: theme.colors.primaryFixed,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  cellCheckBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchesContainer: {
    paddingVertical: 4,
    gap: 10,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: theme.colors.white,
    ...theme.shadows.card,
  },
  actionButtons: {
    marginTop: 24,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    height: 52,
    borderRadius: theme.radii.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  deleteButton: {
    height: 44,
    borderRadius: theme.radii.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.roseLight,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.error,
  },
});
