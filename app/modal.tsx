import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../src/lib/supabase';
import { saveLocalTransaction } from '../src/lib/api';
import { Transaction } from '../src/types/database';
import { theme } from '../src/theme';

const CATEGORIES = [
  { id: 'Food & Dining', name: 'Food & Dining', icon: 'coffee', color: '#e40a65' },
  { id: 'Travel & Fuel', name: 'Travel & Fuel', icon: 'directions_car', color: '#6664e4' },
  { id: 'Movies & Fun', name: 'Movies & Fun', icon: 'movie', color: '#ffd9df' },
  { id: 'Bills & Other', name: 'Bills & Other', icon: 'subscriptions', color: '#dad9df' },
];

export default function ModalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].id);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);

    const categoryObj = CATEGORIES.find((c) => c.id === selectedCategory);
    const newTx: Transaction = {
      id: 'tx-' + Date.now().toString(),
      amount: numAmount,
      type,
      note: note.trim() || selectedCategory,
      date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      category: {
        id: selectedCategory,
        name: selectedCategory,
        color: categoryObj?.color || '#e40a65',
      },
    };

    // 1. Immediately persist to AsyncStorage so transactions are never lost on reload
    await saveLocalTransaction(newTx);

    // 2. Optimistically update local query cache immediately so UI updates instantly
    queryClient.setQueryData(['transactions'], (old: Transaction[] = []) => [newTx, ...old.filter((t) => t.id !== newTx.id)]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const insertPayload: any = {
        amount: numAmount,
        type,
        note: note.trim() || selectedCategory,
        date: new Date().toISOString(),
      };
      if (session?.user?.id) {
        insertPayload.user_id = session.user.id;
      }

      const { error } = await supabase.from('transactions').insert([insertPayload]);

      if (error) {
        if (error.code === '42501') {
          console.warn('Supabase RLS notice (saved locally):', error.message);
          Alert.alert(
            'Saved Locally on Device',
            'Your transaction was recorded and saved locally in Putu. To enable real-time cloud sync, run the RLS policy in your Supabase SQL editor.'
          );
        } else {
          console.warn('Supabase insert notice:', error.message);
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['wallet_balances'] });
      router.back();
    } catch (err) {
      console.warn('Error during transaction submit:', err);
      router.back();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
    >
      {/* Type Switcher */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segment, type === 'expense' && styles.segmentActiveExpense]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setType('expense');
          }}
        >
          <Text
            style={[styles.segmentText, type === 'expense' && styles.segmentTextActive]}
          >
            Expense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, type === 'income' && styles.segmentActiveIncome]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setType('income');
          }}
        >
          <Text
            style={[styles.segmentText, type === 'income' && styles.segmentTextActive]}
          >
            Income
          </Text>
        </TouchableOpacity>
      </View>

      {/* Amount Input */}
      <View style={styles.card}>
        <Text style={styles.label}>AMOUNT</Text>
        <View style={styles.amountRow}>
          <Text style={styles.currencySymbol}>₹</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0"
            placeholderTextColor={theme.colors.secondary}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            autoFocus
          />
        </View>
      </View>

      {/* Category Selection */}
      <View style={styles.card}>
        <Text style={styles.label}>CATEGORY</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryPill,
                  isSelected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(cat.id);
                }}
              >
                <View
                  style={[
                    styles.catDot,
                    { backgroundColor: isSelected ? '#ffffff' : cat.color },
                  ]}
                />
                <Text
                  style={[
                    styles.categoryText,
                    isSelected && { color: '#ffffff', fontWeight: '700' },
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Note / Description */}
      <View style={styles.card}>
        <Text style={styles.label}>NOTE / DESCRIPTION</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Blue Tokai Coffee"
          placeholderTextColor={theme.colors.secondary}
          value={note}
          onChangeText={setNote}
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          type === 'income' && { backgroundColor: theme.colors.emerald },
        ]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.88}
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.submitButtonText}>
            Add {type === 'expense' ? 'Expense' : 'Income'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.margin,
    paddingBottom: 40,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 14,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentActiveExpense: {
    backgroundColor: theme.colors.primary,
  },
  segmentActiveIncome: {
    backgroundColor: theme.colors.emerald,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  segmentTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radii.card,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.secondary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.onSurface,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  textInput: {
    fontSize: 16,
    color: theme.colors.onSurface,
    paddingVertical: 6,
  },
  submitButton: {
    height: 52,
    borderRadius: theme.radii.button,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#e40a65',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
});
