'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings, Lock, Globe, Ruler } from 'lucide-react';
import { useSettingsStore } from '@/stores';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

const dimensionUnits = [
  { value: 'cm', label: 'cm' },
  { value: 'm', label: 'm' },
  { value: 'mm', label: 'mm' },
  { value: 'ft', label: 'ft' },
];

const areaUnits = [
  { value: 'm\u00B2', label: 'm\u00B2' },
  { value: 'ft\u00B2', label: 'ft\u00B2' },
  { value: 'cm\u00B2', label: 'cm\u00B2' },
];

const loadUnits = [
  { value: 'kg', label: 'kg' },
  { value: 'ton', label: 'ton' },
  { value: 'kN', label: 'kN' },
];

const stressUnits = [
  { value: 'kg/cm\u00B2', label: 'kg/cm\u00B2' },
  { value: 'MPa', label: 'MPa' },
  { value: 'kPa', label: 'kPa' },
];

const densityUnits = [
  { value: 'kg/m\u00B3', label: 'kg/m\u00B3' },
  { value: 'kN/m\u00B3', label: 'kN/m\u00B3' },
];

export default function SettingsPanel() {
  const { t, setLanguage } = useTranslation();
  const { language, units, setLanguage: setStoreLanguage, setUnits } = useSettingsStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleLanguageChange = (lang: string) => {
    setStoreLanguage(lang as 'ar' | 'en');
    setLanguage(lang as 'ar' | 'en');
  };

  const handleUnitsChange = (field: string, value: string) => {
    setUnits({
      ...units,
      [field]: value,
    });
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('كلمات المرور غير متطابقة');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    if (newPassword.length > 128) {
      toast.error('كلمة المرور طويلة جداً (الحد الأقصى 128 حرف)');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('تم تغيير كلمة المرور بنجاح');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(data.error || 'حدث خطأ أثناء تغيير كلمة المرور');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Language & Display */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Globe className="h-5 w-5" />
            </div>
            <span>{language === 'ar' ? 'اللغة والعرض' : 'Language & Display'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2 max-w-md">
            <Label className="text-sm font-medium text-foreground/80">
              {language === 'ar' ? 'اللغة' : 'Language'}
            </Label>
            <Select
              value={language}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">العربية</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'ar'
                ? 'سيتم إعادة تحميل الصفحة عند تغيير اللغة'
                : 'Page will reload when changing language'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Units Configuration */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Ruler className="h-5 w-5" />
            </div>
            <span>{language === 'ar' ? 'إعدادات الوحدات' : 'Unit Settings'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Dimension Units */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {language === 'ar' ? 'وحدات الأبعاد' : 'Dimension Units'}
              </Label>
              <Select
                value={units.dimension}
                onValueChange={(val) => handleUnitsChange('dimension', val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dimensionUnits.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Area Units */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {language === 'ar' ? 'وحدات المساحة' : 'Area Units'}
              </Label>
              <Select
                value={units.area}
                onValueChange={(val) => handleUnitsChange('area', val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {areaUnits.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Load Units */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {language === 'ar' ? 'وحدات الحمولات' : 'Load Units'}
              </Label>
              <Select
                value={units.load}
                onValueChange={(val) => handleUnitsChange('load', val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {loadUnits.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stress Units */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {language === 'ar' ? 'وحدات الإجهادات' : 'Stress Units'}
              </Label>
              <Select
                value={units.stress}
                onValueChange={(val) => handleUnitsChange('stress', val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stressUnits.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Density Units */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {language === 'ar' ? 'وحدات الكثافة' : 'Density Units'}
              </Label>
              <Select
                value={units.density}
                onValueChange={(val) => handleUnitsChange('density', val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {densityUnits.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              {language === 'ar'
                ? 'يتم حفظ إعدادات الوحدات تلقائياً'
                : 'Unit settings are saved automatically'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Lock className="h-5 w-5" />
            </div>
            <span>{language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {language === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}
              </Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={language === 'ar' ? 'أدخل كلمة المرور الحالية' : 'Enter current password'}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
              </Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={language === 'ar' ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {language === 'ar'
                  ? 'الحد الأدنى 8 أحرف، الحد الأقصى 128 حرف'
                  : 'Minimum 8 characters, maximum 128'}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
              </Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={language === 'ar' ? 'أعد إدخال كلمة المرور الجديدة' : 'Re-enter new password'}
                className="w-full"
              />
            </div>

            <div className="pt-2">
              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChangingPassword ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {language === 'ar' ? 'جاري التغيير...' : 'Changing...'}
                  </span>
                ) : (
                  (language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password')
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
