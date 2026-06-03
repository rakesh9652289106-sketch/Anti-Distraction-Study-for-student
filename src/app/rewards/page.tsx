'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { RewardItem } from '@/lib/db';

export default function RewardsPage() {
  const { settings, buyRewardItem, sessions } = useApp();
  const [rewardsList, setRewardsList] = useState<RewardItem[]>([]);
  const [purchaseStatus, setPurchaseStatus] = useState<string | null>(null);

  const fetchRewards = async () => {
    try {
      const res = await fetch('/api/rewards');
      const data = await res.json();
      setRewardsList(data.items);
    } catch (e) {
      console.error('Failed to fetch rewards:', e);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, [settings.focusCoins]);

  const handlePurchase = async (itemId: string) => {
    setPurchaseStatus(null);
    const result = await buyRewardItem(itemId);
    if (result.success) {
      setPurchaseStatus(`Success: ${result.message}`);
      fetchRewards();
    } else {
      setPurchaseStatus(`Error: ${result.message}`);
    }
  };

  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalXP = totalMinutes * 10 + 4250; // Add base mock XP
  const focusLevel = Math.floor(totalXP / 1000) + 1;
  const currentXPProgress = totalXP % 1000;

  return (
    <div className="space-y-lg">
      {/* Hero Header */}
      <div className="mb-lg">
        <h2 className="font-bold text-headline-xl text-primary leading-tight">Rewards Hub</h2>
        <p className="text-body-lg text-on-surface-variant mt-2 font-medium">
          Level up your productivity and claim your rewards.
        </p>
      </div>

      {/* Stats Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-md">
        {/* XP Card */}
        <div className="bg-surface rounded-xl border border-outline-variant/30 p-md shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-tertiary-container/10 rounded-full blur-xl"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Total XP</span>
            <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg font-bold">stars</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-headline-xl text-primary">{totalXP.toLocaleString()}</span>
            <span className="text-label-sm text-secondary flex items-center font-bold">
              <span className="material-symbols-outlined text-sm font-bold">arrow_upward</span> +150 today
            </span>
          </div>
        </div>

        {/* Streak Card */}
        <div className="bg-surface rounded-xl border border-outline-variant/30 p-md shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary-container/20 rounded-full blur-xl"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Daily Streak</span>
            <span className="material-symbols-outlined text-secondary bg-secondary/10 p-2 rounded-lg font-bold">
              local_fire_department
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-headline-xl text-primary">{settings.currentStreak}</span>
            <span className="text-label-sm text-on-surface-variant font-medium">Days</span>
          </div>
          <div className="w-full bg-surface-container h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-secondary h-full rounded-full" style={{ width: `${(settings.currentStreak / 15) * 100}%` }}></div>
          </div>
          <p className="text-label-sm text-on-surface-variant/70 mt-2 text-right font-medium">
            Next milestone at 15 days
          </p>
        </div>

        {/* Level Card */}
        <div className="bg-primary text-on-primary rounded-xl border border-primary p-md shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-label-sm font-bold text-primary-fixed-dim uppercase tracking-wider">Focus Level</span>
            <span className="material-symbols-outlined text-on-primary font-bold">psychology</span>
          </div>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="font-bold text-headline-xl">{focusLevel}</span>
            <span className="text-label-sm text-primary-fixed-dim font-bold">Master</span>
          </div>
          <div className="w-full bg-primary-container h-1.5 rounded-full mt-4 overflow-hidden relative z-10">
            <div className="bg-white h-full rounded-full" style={{ width: `${(currentXPProgress / 1000) * 100}%` }}></div>
          </div>
          <p className="text-label-sm text-primary-fixed-dim mt-2 text-right relative z-10 font-semibold">
            {currentXPProgress} / 1,000 XP
          </p>
        </div>
      </section>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        
        {/* Achievements List */}
        <section className="lg:col-span-2 bg-surface rounded-xl border border-outline-variant/30 p-md shadow-sm">
          <div className="flex items-center justify-between mb-md">
            <h3 className="font-bold text-headline-md text-primary">Recent Achievements</h3>
            <button className="text-label-sm font-bold text-primary hover:underline cursor-pointer">
              View All
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* Badge 1 */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-4 flex flex-col items-center text-center hover:bg-surface-container transition-colors cursor-pointer group">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-amber-600 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  workspace_premium
                </span>
              </div>
              <h4 className="text-label-md font-bold text-primary mb-1">Gold Badge</h4>
              <p className="text-label-sm text-on-surface-variant font-semibold">100 hours focused</p>
            </div>

            {/* Badge 2 */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-4 flex flex-col items-center text-center hover:bg-surface-container transition-colors cursor-pointer group">
              <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-purple-600 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  diamond
                </span>
              </div>
              <h4 className="text-label-md font-bold text-primary mb-1">Focus Crown</h4>
              <p className="text-label-sm text-on-surface-variant font-semibold">Top 5% this week</p>
            </div>

            {/* Badge 3 */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-4 flex flex-col items-center text-center hover:bg-surface-container transition-colors cursor-pointer group">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-emerald-600 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  do_not_disturb_off
                </span>
              </div>
              <h4 className="text-label-md font-bold text-primary mb-1">No Distractions</h4>
              <p className="text-label-sm text-on-surface-variant font-semibold">Zero app switches</p>
            </div>

            {/* Badge 4 - Locked */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-4 flex flex-col items-center text-center opacity-50 grayscale cursor-not-allowed">
              <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-on-surface-variant text-3xl font-bold">lock</span>
              </div>
              <h4 className="text-label-md font-bold text-on-surface-variant mb-1">Early Bird</h4>
              <p className="text-label-sm text-on-surface-variant font-semibold">Focus before 6 AM</p>
            </div>
          </div>
        </section>

        {/* Right side: Leaderboard & Coin Store */}
        <div className="space-y-md">
          {/* Leaderboard */}
          <section className="bg-surface rounded-xl border border-outline-variant/30 p-md shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-label-md font-bold text-primary uppercase tracking-wide">Top Focused</h3>
              <span className="text-label-sm text-on-surface-variant font-semibold">This Week</span>
            </div>
            
            <ul className="space-y-3">
              <li className="flex items-center justify-between p-2 bg-surface-container-low rounded-lg border border-tertiary-container/10">
                <div className="flex items-center gap-3">
                  <span className="text-label-md text-primary font-bold w-4 text-center">1</span>
                  <div className="w-8 h-8 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center font-bold text-xs">
                    AS
                  </div>
                  <span className="text-body-md font-bold text-primary">Alex S.</span>
                </div>
                <span className="text-label-md text-on-surface-variant font-semibold">42h 15m</span>
              </li>
              
              <li className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-label-md text-on-surface-variant w-4 text-center">2</span>
                  <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center font-bold text-xs">
                    MJ
                  </div>
                  <span className="text-body-md font-medium text-on-surface">Mia J.</span>
                </div>
                <span className="text-label-md text-on-surface-variant font-semibold">38h 40m</span>
              </li>

              <li className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-label-md text-on-surface-variant w-4 text-center">3</span>
                  <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-xs">
                    YOU
                  </div>
                  <span className="text-body-md font-bold text-on-surface">You</span>
                </div>
                <span className="text-label-md text-on-surface-variant font-semibold">35h 20m</span>
              </li>
            </ul>
          </section>

          {/* Coin Store Card */}
          <section className="bg-primary text-on-primary rounded-xl border border-primary p-md shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
              <span className="material-symbols-outlined text-[120px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                shopping_bag
              </span>
            </div>
            
            <h3 className="font-bold text-headline-md mb-2 relative z-10">Store</h3>
            <p className="text-body-md text-primary-fixed-dim mb-4 relative z-10">
              Buy themes and utilities using your focus coins.
            </p>

            {purchaseStatus && (
              <div className="mb-sm text-xs p-2 rounded bg-white/10 text-white font-medium relative z-10 animate-pulse">
                {purchaseStatus}
              </div>
            )}

            <div className="space-y-sm relative z-10 max-h-56 overflow-y-auto pr-xs">
              {rewardsList.map(item => (
                <div key={item.id} className="flex justify-between items-center p-sm bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                  <div>
                    <h4 className="text-label-md font-bold text-white flex items-center gap-xs">
                      <span className="material-symbols-outlined text-sm font-bold">{item.icon}</span>
                      {item.title}
                    </h4>
                    <p className="text-[10px] text-primary-fixed-dim mt-0.5">{item.description}</p>
                  </div>
                  <button
                    disabled={item.purchased || settings.focusCoins < item.cost}
                    onClick={() => handlePurchase(item.id)}
                    className={`px-sm py-1.5 rounded text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
                      item.purchased
                        ? 'bg-secondary text-white cursor-default'
                        : settings.focusCoins >= item.cost
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                        : 'bg-white/10 text-white/45 cursor-not-allowed'
                    }`}
                  >
                    {item.purchased ? 'Owned' : `${item.cost} c`}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
