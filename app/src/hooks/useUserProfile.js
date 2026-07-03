import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncUserProfile, deleteUserProfile } from '../config/firebase';

const defaultCar = {
  brandId: 'toyota',
  brandName: 'Toyota',
  model: 'Prius',
  colorId: 'white',
  colorHex: '#FFFFFF',
};

const defaultStats = {
  'where-is-street': { wins: 0, losses: 0 },
  'where-is-place': { wins: 0, losses: 0 },
  'what-street': { wins: 0, losses: 0 },
};

const useUserProfile = create(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      googleUser: null, // { sub, email, name, picture }
      hasCompletedProfile: false,
      hasCompletedOnboarding: false,
      hideEmail: false,
      
      // Premium & Customization features
      isPremium: false,
      customAvatar: null, // skompresowany base64
      dailyGamesPlayed: { date: '', count: 0 }, // limit gier

      // Saved accounts database keyed by email / sub
      savedProfiles: {}, // { [email]: { email, name, town, avatarId, car, stats, challengeAttempts, hasCompletedProfile: true, hasCompletedOnboarding: true, hideEmail: false, isPremium, customAvatar, dailyGamesPlayed } }

      // Current active profile fields
      name: '',
      email: '',
      town: 'Legnica',
      avatarId: 'bolciarz-1',
      car: defaultCar,
      stats: defaultStats,
      challengeAttempts: {}, // { [challengeId]: score }
      onlineWins: 0,
      onlineLosses: 0,
      onlineDraws: 0,

      setGoogleUser: (userPayload) => {
        const emailKey = userPayload.email?.toLowerCase()?.trim() || userPayload.sub;
        const savedProfiles = get().savedProfiles || {};
        const existingProfile = savedProfiles[emailKey];

        const initialName = existingProfile?.name || (userPayload.name ? userPayload.name.split(' ')[0] : 'Bolter');
        const initialProfileData = {
          email: userPayload.email,
          name: initialName,
          town: existingProfile?.town || 'Legnica',
          avatarId: existingProfile?.avatarId || 'bolciarz-1',
          car: existingProfile?.car || defaultCar,
          stats: existingProfile?.stats || defaultStats,
          challengeAttempts: existingProfile?.challengeAttempts || {},
          hasCompletedProfile: !!existingProfile?.hasCompletedProfile,
          hasCompletedOnboarding: !!existingProfile?.hasCompletedOnboarding,
          hideEmail: !!existingProfile?.hideEmail,
          isPremium: !!existingProfile?.isPremium,
          customAvatar: existingProfile?.customAvatar || null,
          dailyGamesPlayed: existingProfile?.dailyGamesPlayed || { date: '', count: 0 },
          onlineWins: existingProfile?.onlineWins || 0,
          onlineLosses: existingProfile?.onlineLosses || 0,
          onlineDraws: existingProfile?.onlineDraws || 0,
        };

        if (existingProfile && existingProfile.hasCompletedProfile) {
          set({
            isLoggedIn: true,
            googleUser: userPayload,
            email: userPayload.email,
            name: existingProfile.name || initialName,
            town: existingProfile.town || 'Legnica',
            avatarId: existingProfile.avatarId || 'bolciarz-1',
            car: existingProfile.car || defaultCar,
            stats: existingProfile.stats || defaultStats,
            challengeAttempts: existingProfile.challengeAttempts || {},
            hasCompletedProfile: true,
            hasCompletedOnboarding: !!existingProfile.hasCompletedOnboarding,
            hideEmail: !!existingProfile.hideEmail,
            isPremium: !!existingProfile.isPremium,
            customAvatar: existingProfile.customAvatar || null,
            dailyGamesPlayed: existingProfile.dailyGamesPlayed || { date: '', count: 0 },
            onlineWins: existingProfile.onlineWins || 0,
            onlineLosses: existingProfile.onlineLosses || 0,
            onlineDraws: existingProfile.onlineDraws || 0,
            savedProfiles: {
              ...savedProfiles,
              [emailKey]: initialProfileData
            }
          });
        } else {
          set({
            isLoggedIn: true,
            googleUser: userPayload,
            email: userPayload.email,
            name: initialName,
            stats: defaultStats,
            challengeAttempts: {},
            hasCompletedProfile: false,
            hasCompletedOnboarding: false,
            hideEmail: false,
            isPremium: false,
            customAvatar: null,
            dailyGamesPlayed: { date: '', count: 0 },
            onlineWins: 0,
            onlineLosses: 0,
            onlineDraws: 0,
            savedProfiles: {
              ...savedProfiles,
              [emailKey]: initialProfileData
            }
          });
        }
        if (!get().googleUser?.isTestUser) {
          syncUserProfile(get());
        }
      },

      loginAsTestUser: (asAdmin = false) => {
        const savedProfiles = get().savedProfiles || {};
        const email = asAdmin ? 'amadeuszzurawiecki@gmail.com' : 'tester@spotastreet.local';
        const emailKey = email.toLowerCase().trim();
        const existingProfile = savedProfiles[emailKey] || {};
        const testProfile = {
          email,
          name: existingProfile.name || (asAdmin ? 'Admin Test' : 'Tester'),
          town: existingProfile.town || 'Legnica',
          avatarId: existingProfile.avatarId || 'amadi',
          car: existingProfile.car || defaultCar,
          stats: existingProfile.stats || defaultStats,
          challengeAttempts: existingProfile.challengeAttempts || {},
          hasCompletedProfile: true,
          hasCompletedOnboarding: true,
          hideEmail: !!existingProfile.hideEmail,
          isPremium: asAdmin ? true : !!existingProfile.isPremium,
          customAvatar: existingProfile.customAvatar || null,
          dailyGamesPlayed: existingProfile.dailyGamesPlayed || { date: '', count: 0 },
          onlineWins: existingProfile.onlineWins || 0,
          onlineLosses: existingProfile.onlineLosses || 0,
          onlineDraws: existingProfile.onlineDraws || 0,
        };

        set({
          isLoggedIn: true,
          googleUser: {
            sub: asAdmin ? 'test-admin' : 'test-user',
            email,
            name: testProfile.name,
            picture: null,
            isTestUser: true,
          },
          ...testProfile,
          savedProfiles: {
            ...savedProfiles,
            [emailKey]: testProfile,
          },
        });

        // Test login is intentionally local-only while Google auth is disabled.
      },

      logout: () => {
        set({
          isLoggedIn: false,
          googleUser: null,
        });
      },

      completeProfileSetup: () => {
        const { googleUser, email, name, town, avatarId, car, stats, challengeAttempts, savedProfiles, hasCompletedOnboarding, hideEmail, isPremium, customAvatar, dailyGamesPlayed, onlineWins, onlineLosses, onlineDraws } = get();
        const emailKey = email?.toLowerCase()?.trim() || googleUser?.sub;

        const updatedProfileData = {
          email: email || googleUser?.email,
          name: name || 'Bolter',
          town: town || 'Legnica',
          avatarId: avatarId || 'bolciarz-1',
          car: car || defaultCar,
          stats: stats || defaultStats,
          challengeAttempts: challengeAttempts || {},
          hasCompletedProfile: true,
          hasCompletedOnboarding,
          hideEmail,
          isPremium,
          customAvatar,
          dailyGamesPlayed,
          onlineWins: onlineWins || 0,
          onlineLosses: onlineLosses || 0,
          onlineDraws: onlineDraws || 0,
        };

        set({
          hasCompletedProfile: true,
          savedProfiles: {
            ...savedProfiles,
            ...(emailKey ? { [emailKey]: updatedProfileData } : {}),
          },
        });

        syncUserProfile(get());
      },

      completeOnboarding: () => {
        const { googleUser, email, savedProfiles } = get();
        const emailKey = email?.toLowerCase()?.trim() || googleUser?.sub;

        set((state) => {
          const newState = {
            ...state,
            hasCompletedOnboarding: true,
          };

          if (emailKey && newState.hasCompletedProfile) {
            newState.savedProfiles = {
              ...newState.savedProfiles,
              [emailKey]: {
                ...newState.savedProfiles[emailKey],
                hasCompletedOnboarding: true,
              },
            };
          }

          syncUserProfile(newState);
          return newState;
        });
      },

      incrementDailyGameCount: () => {
        const todayStr = new Date().toLocaleDateString('sv').substring(0, 10);
        const { dailyGamesPlayed } = get();
        let newCount = 1;
        if (dailyGamesPlayed && dailyGamesPlayed.date === todayStr) {
          newCount = dailyGamesPlayed.count + 1;
        }
        
        get().updateProfile({
          dailyGamesPlayed: { date: todayStr, count: newCount }
        });
      },

      canPlaySingleplayer: () => {
        if (get().isPremium) return true;
        const todayStr = new Date().toLocaleDateString('sv').substring(0, 10);
        const daily = get().dailyGamesPlayed || { date: '', count: 0 };
        if (daily.date !== todayStr) return true;
        return daily.count < 3;
      },

      updateProfile: (updatedFields) => {
        set((state) => {
          const newState = { ...state, ...updatedFields };
          const emailKey = newState.email?.toLowerCase()?.trim() || newState.googleUser?.sub;
          if (emailKey && newState.hasCompletedProfile) {
            newState.savedProfiles = {
              ...newState.savedProfiles,
              [emailKey]: {
                ...newState.savedProfiles[emailKey],
                ...updatedFields,
              },
            };
          }
          syncUserProfile(newState);
          return newState;
        });
      },

      recordOnlineMatchResult: (result) => {
        set((state) => {
          let wins = state.onlineWins || 0;
          let losses = state.onlineLosses || 0;
          let draws = state.onlineDraws || 0;
          
          if (result === 'win') wins += 1;
          else if (result === 'loss') losses += 1;
          else if (result === 'draw') draws += 1;
          
          const newState = {
            ...state,
            onlineWins: wins,
            onlineLosses: losses,
            onlineDraws: draws
          };
          
          const emailKey = newState.email?.toLowerCase()?.trim() || newState.googleUser?.sub;
          if (emailKey && newState.hasCompletedProfile) {
            newState.savedProfiles = {
              ...newState.savedProfiles,
              [emailKey]: {
                ...newState.savedProfiles[emailKey],
                onlineWins: wins,
                onlineLosses: losses,
                onlineDraws: draws,
              },
            };
          }
          syncUserProfile(newState);
          return newState;
        });
      },

      updateCar: (carFields) => {
        set((state) => {
          const newCar = { ...state.car, ...carFields };
          const newState = { ...state, car: newCar };
          const emailKey = newState.email?.toLowerCase()?.trim() || newState.googleUser?.sub;
          if (emailKey && newState.hasCompletedProfile) {
            newState.savedProfiles = {
              ...newState.savedProfiles,
              [emailKey]: {
                ...newState.savedProfiles[emailKey],
                car: newCar,
              },
            };
          }
          syncUserProfile(newState);
          return newState;
        });
      },

      recordGameResult: (gameModeId, won) => {
        set((state) => {
          const currentStats = state.stats || defaultStats;
          const modeStats = currentStats[gameModeId] || { wins: 0, losses: 0 };
          
          const updatedStats = {
            ...currentStats,
            [gameModeId]: {
              wins: won ? modeStats.wins + 1 : modeStats.wins,
              losses: !won ? modeStats.losses + 1 : modeStats.losses,
            }
          };

          const newState = { ...state, stats: updatedStats };
          const emailKey = newState.email?.toLowerCase()?.trim() || newState.googleUser?.sub;
          if (emailKey && newState.hasCompletedProfile) {
            newState.savedProfiles = {
              ...newState.savedProfiles,
              [emailKey]: {
                ...newState.savedProfiles[emailKey],
                stats: updatedStats,
              },
            };
          }
          syncUserProfile(newState);
          return newState;
        });
      },

      recordChallengeAttempt: (challengeId, score) => {
        set((state) => {
          const currentAttempts = state.challengeAttempts || {};
          const updatedAttempts = {
            ...currentAttempts,
            [challengeId]: score
          };

          const newState = { ...state, challengeAttempts: updatedAttempts };
          const emailKey = newState.email?.toLowerCase()?.trim() || newState.googleUser?.sub;
          if (emailKey && newState.hasCompletedProfile) {
            newState.savedProfiles = {
              ...newState.savedProfiles,
              [emailKey]: {
                ...newState.savedProfiles[emailKey],
                challengeAttempts: updatedAttempts,
              },
            };
          }
          syncUserProfile(newState);
          return newState;
        });
      },

      deleteUserAccount: async (targetEmail) => {
        if (!targetEmail) return;
        const emailKey = targetEmail.toLowerCase().trim();
        
        set((state) => {
          const newSaved = { ...state.savedProfiles };
          delete newSaved[emailKey];

          // If current user deleted themselves, logout
          const currentEmail = state.email?.toLowerCase()?.trim();
          if (currentEmail === emailKey) {
            return {
              savedProfiles: newSaved,
              isLoggedIn: false,
              googleUser: null,
            };
          }

          return { savedProfiles: newSaved };
        });

        await deleteUserProfile(targetEmail);
      },
    }),
    {
      name: 'bolters-persistent-user-database',
    }
  )
);

export default useUserProfile;
