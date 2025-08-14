import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, FlatList } from 'react-native';
import { useTheme } from '../theme';
import {
  CountryCode,
  limitNat,
  validNat,
  formatNat,
  natPlaceholder,
} from '../../utils/phoneIntl';

const COUNTRIES: Array<{ code: CountryCode; label: string; flag: string }> = [
  { code: 'BR', label: 'Brasil (+55)', flag: '🇧🇷' },
  { code: 'US', label: 'Estados Unidos (+1)', flag: '🇺🇸' },
  { code: 'PT', label: 'Portugal (+351)', flag: '🇵🇹' },
  { code: 'MX', label: 'México (+52)', flag: '🇲🇽' },
  { code: 'AR', label: 'Argentina (+54)', flag: '🇦🇷' },
  { code: 'CL', label: 'Chile (+56)', flag: '🇨🇱' },
];

export default function PhoneInput({
  label = 'Telefone',
  country,
  digits,
  onChange,
  errorText,
}: {
  label?: string;
  country: CountryCode;
  digits: string; // apenas dígitos NACIONAIS
  onChange: (v: { country: CountryCode; digits: string }) => void;
  errorText?: string;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);

  const displayNat = formatNat(country, digits);
  const isValid = validNat(country, digits);

  return (
    <View style={{ marginBottom: t.spacing.md }}>
      {label ? (
        <Text style={{ color: t.colors.subtext, marginBottom: 6 }}>{label}</Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {/* Seletor de país (lado do campo) */}
        <Pressable
          onPress={() => setOpen(true)}
          style={{
            paddingHorizontal: t.spacing.md,
            paddingVertical: 12,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: t.colors.border,
            backgroundColor: t.colors.surface,
            minWidth: 140,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: t.colors.text }}>
            {COUNTRIES.find((c) => c.code === country)?.label || country}
          </Text>
        </Pressable>

        {/* Campo SOMENTE do número nacional */}
        <TextInput
          placeholder={natPlaceholder(country)}
          placeholderTextColor={t.colors.subtext}
          value={displayNat}
          onChangeText={(v) => {
            const nat = limitNat(country, v); // mantém só dígitos (limita por país)
            onChange({ country, digits: nat });
          }}
          keyboardType="phone-pad"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: t.colors.border,
            borderRadius: t.radius.md,
            paddingHorizontal: t.spacing.md,
            paddingVertical: 12,
            color: t.colors.text,
            backgroundColor: t.colors.surface,
          }}
        />
      </View>

      {/* Ajuda/erro abaixo do campo */}
      {!!errorText ? (
        <Text style={{ color: t.colors.danger, marginTop: 6 }}>{errorText}</Text>
      ) : !!digits && !isValid ? (
        <Text style={{ color: t.colors.warning, marginTop: 6 }}>
          Telefone parece incompleto para{' '}
          {COUNTRIES.find((c) => c.code === country)?.label}.
        </Text>
      ) : null}

      {/* Modal simples para escolher país */}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
          <View
            style={{
              paddingHorizontal: t.spacing.lg,
              paddingVertical: t.spacing.md,
              borderBottomWidth: 1,
              borderColor: t.colors.border,
              backgroundColor: t.colors.bg,
            }}
          >
            <Text style={{ color: t.colors.text, fontSize: 18, fontWeight: '700' }}>
              Selecionar país
            </Text>
          </View>

          <FlatList
            data={COUNTRIES}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange({ country: item.code, digits });
                  setOpen(false);
                }}
                style={{
                  paddingHorizontal: t.spacing.lg,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderColor: t.colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Text style={{ fontSize: 18 }}>{item.flag}</Text>
                <Text style={{ color: t.colors.text }}>{item.label}</Text>
              </Pressable>
            )}
          />

          <View style={{ padding: t.spacing.md }}>
            <Pressable
              onPress={() => setOpen(false)}
              style={{
                borderWidth: 1,
                borderColor: t.colors.border,
                borderRadius: t.radius.md,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: t.colors.text }}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
