import React, { useEffect, useState } from 'react';
import { GlassButton } from '../common/GlassButton';
import { Shield, CheckCircle2, Save, Globe } from 'lucide-react';
import {
  getDealerSettingsAction,
  saveDealerSettingsAction,
} from '../../lib/actions/settings';

export const AdminSettings: React.FC = () => {
  const [dealershipName, setDealershipName] = useState('NEW ROYAL CARS');
  const [contactPhone, setContactPhone] = useState('');
  const [supportEmail, setSupportEmail] = useState('concierge@newroyalcars.com');
  const [showroomAddress, setShowroomAddress] = useState('Plot 42, Royal Pavilion Blvd, Worli Sea Face, Mumbai');
  const [businessHours, setBusinessHours] = useState('Mon – Sun: 10:00 AM – 8:30 PM');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [enableInstantSms, setEnableInstantSms] = useState(true);
  const [enableEmailAlerts, setEnableEmailAlerts] = useState(true);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load the persisted configuration once on mount.
  useEffect(() => {
    let active = true;
    getDealerSettingsAction().then((res) => {
      if (!active || !res.ok || !res.data) return;
      const d = res.data;
      setDealershipName(d.dealershipName);
      setContactPhone(d.contactPhone);
      setSupportEmail(d.supportEmail);
      setShowroomAddress(d.showroomAddress);
      setBusinessHours(d.businessHours);
      setWhatsappNumber(d.whatsappNumber);
      setMapsUrl(d.mapsUrl);
      setEnableInstantSms(d.enableInstantSms);
      setEnableEmailAlerts(d.enableEmailAlerts);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await saveDealerSettingsAction({
        dealershipName,
        contactPhone,
        supportEmail,
        showroomAddress,
        businessHours,
        whatsappNumber,
        mapsUrl,
        enableInstantSms,
        enableEmailAlerts,
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setSaveError(res.error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-white/60';

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Dealership Configuration & Preferences
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Manage brand identity, contact points, and notification workflows. Saved details appear instantly on the public Contact page.
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>Dealership preferences saved successfully.</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Brand Information */}
        <div className="p-6 rounded-2xl bg-neutral-900/40 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
          <h3 className="text-xs uppercase font-bold tracking-widest text-neutral-400 font-serif flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span>Public Dealership Identity</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                Dealership Brand Name
              </label>
              <input
                type="text"
                value={dealershipName}
                onChange={(e) => setDealershipName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                Primary Hotline Phone
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 XXXXXXXXXX"
                className={`${inputClass} font-mono`}
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                Official VIP Concierge Email
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                WhatsApp Number (optional)
              </label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+91 XXXXXXXXXX"
                className={`${inputClass} font-mono`}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                Dealership Address
              </label>
              <input
                type="text"
                value={showroomAddress}
                onChange={(e) => setShowroomAddress(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                Business Hours
              </label>
              <input
                type="text"
                value={businessHours}
                onChange={(e) => setBusinessHours(e.target.value)}
                placeholder="Mon – Sun: 10:00 AM – 8:30 PM"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-300 font-medium mb-1">
                Google Maps / Location URL (optional)
              </label>
              <input
                type="url"
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
                placeholder="https://maps.google.com/..."
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <GlassButton variant="gold" size="md" glow icon={<Save className="w-4 h-4" />} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save All Preferences'}
          </GlassButton>
        </div>
      </form>
    </div>
  );
};
