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
import { Settings } from 'lucide-react';
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
  { value: 'm²', label: 'm²' },
  { value: 'ft²', label: 'ft²' },
  { value: 'cm²', label: 'cm²' },
];

const loadUnits = [
  { value: 'kg', label: 'kg' },
  { value: 'ton', label: 'ton' },
  { value: 'kN', label: 'kN' },
];

const stressUnits = [
  { value: 'kg/cm²', label: 'kg/cm²' },
  { value: 'MPa', label: 'MPa' },
  { value: 'kPa', label: 'kPa' },
];

const densityUnits = [
  { value: 'kg/m³', label: 'kg/m³' },
  { value: 'kN/m³', label: 'kN/m³' },
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

    if (newPassword.length < 4) {
      toast.error('كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل');
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
              <Settings className="h-5 w-5" />
            </div>
            <span>اللغة والعرض</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2 max-w-md">
            <Label className="text-sm font-medium text-foreground/80">
              اللغة
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
              سيتم إعادة تحميل الصفحة عند تغيير اللغة
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Units Configuration */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <path d="M10 9H8" />
              </svg>
            </div>
            <span>إعدادات الوحدات</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Dimension Units */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                وحدات الأبعاد
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
                وحدات المساحة
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
                وحدات الحمولات
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
                وحدات الإجهادات
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
                وحدات الكثافة
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
              💡 يتم حفظ إعدادات الوحدات تلقائياً
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="border-emerald-200/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-4">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <span>تغيير كلمة المرور</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                كلمة المرور الحالية
              </Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                كلمة المرور الجديدة
              </Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                تأكيد كلمة المرور
              </Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور الجديدة"
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
                    جاري التغيير...
                  </span>
                ) : (
                  'تغيير كلمة المرور'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
