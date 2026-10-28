import { useEffect } from 'react';
import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

export function useAdMob() {
  useEffect(() => {
    const initializeAdMob = async () => {
      // AdMob is only available on native devices
      if (!Capacitor.isNativePlatform()) return;

      try {
        await AdMob.initialize({
          testingDevices: [],
          initializeForTesting: true,
        });
        
        console.log('AdMob initialized successfully');
        
        // Show banner at the bottom
        await AdMob.showBanner({
          adId: 'ca-app-pub-3940256099942544/6300978111',
          adSize: BannerAdSize.BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: true,
        });
      } catch (error) {
        console.error('Failed to initialize AdMob', error);
      }
    };
    
    initializeAdMob();
    
    return () => {
      if (Capacitor.isNativePlatform()) {
        AdMob.hideBanner().catch(console.error);
        AdMob.removeBanner().catch(console.error);
      }
    };
  }, []);

  const showInterstitial = async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('Interstitial ads are only available on native devices');
      return;
    }

    try {
      await AdMob.prepareInterstitial({
        adId: 'ca-app-pub-3940256099942544/1033173712',
        isTesting: true
      });
      await AdMob.showInterstitial();
    } catch (error) {
      console.error('Failed to show interstitial ad', error);
    }
  };

  return { showInterstitial };
}
