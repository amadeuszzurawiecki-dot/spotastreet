import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  syncUserProfile,
  deleteUserProfile,
  logoutUser,
  observeFirebaseAuth,
  refreshCurrentUserClaims,
} from '../config/firebase';
import { DEFAULT_MAP_STYLE_ID } from '../config/mapStyles';
import {
  canUseLocalGoogleCredentialFallback,
  parseGoogleCredential,
  signInWithGoogleCredential,
  signInWithGooglePopup,
} from '../features/auth/authService';

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

function sanitizeSavedProfiles(savedProfiles = {}) {
  return Object.fromEntries(
    Object.entries(savedProfiles || {}).map(([key, profile]) => ([
      key,
      {
        email: profile?.email || '',
        name: profile?.name || '',
        town: profile?.town || 'Legnica',
        avatarId: profile?.avatarId || 'bolciarz-1',
        car: profile?.car || defaultCar,
        stats: profile?.stats || defaultStats,
        challengeAttempts: profile?.challengeAttempts || {},
        hasCompletedProfile: profile?.hasCompletedProfile === true,
        hasCompletedOnboarding: profile?.hasCompletedOnboarding === true,
        hideEmail: profile?.hideEmail === true,
        customAvatar: profile?.customAvatar || null,
        dailyGamesPlayed: profile?.dailyGamesPlayed || { date: '', count: 0 },
        onlineWins: Number(profile?.onlineWins) || 0,
        onlineLosses: Number(profile?.onlineLosses) || 0,
        onlineDraws: Number(profile?.onlineDraws) || 0,
        mapStyle: profile?.mapStyle || DEFAULT_MAP_STYLE_ID,
      },
    ]))
  );
}

const useUserProfile = create(
  persist(
    (set, get) => ({
      authReady: false,
      authUid: '',
      isAdmin: false,
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
      mapStyle: DEFAULT_MAP_STYLE_ID,

      initializeAuthListener: () => {
        if (get()._authUnsubscribe) return get()._authUnsubscribe;

        const unsubscribe = observeFirebaseAuth(async (firebaseUser) => {
          if (!firebaseUser) {
            set({
              authReady: true,
              authUid: '',
              isAdmin: false,
              isLoggedIn: false,
              googleUser: null,
              email: '',
            });
            return;
          }

          try {
            const token = await firebaseUser.getIdTokenResult(true);
            const userPayload = {
              sub: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Gracz',
              picture: firebaseUser.photoURL || '',
            };

            get().setGoogleUser(userPayload, {
              authUid: firebaseUser.uid,
              isAdmin: token.claims?.admin === true,
            });
          } catch (e) {
            console.warn('Firebase auth state error:', e.message);
            set({
              authReady: true,
              authUid: firebaseUser.uid,
              isAdmin: false,
              isLoggedIn: false,
              googleUser: null,
              email: '',
            });
          }
        });

        set({ _authUnsubscribe: unsubscribe });
        return unsubscribe;
      },

      loginWithGoogleCredential: async (googleCredential) => {
        try {
          await signInWithGoogleCredential(googleCredential);
        } catch (e) {
          if (
            e?.code !== 'auth/configuration-not-found'
            || !canUseLocalGoogleCredentialFallback()
          ) {
            throw e;
          }

          const payload = parseGoogleCredential(googleCredential);
          if (!payload?.email) throw e;

          get().setGoogleUser({
            sub: payload.sub,
            email: payload.email,
            name: payload.name || payload.given_name || payload.email.split('@')[0],
            picture: payload.picture || '',
          }, {
            authUid: '',
            isAdmin: false,
            isLocalFallback: true,
          });
        }
      },

      loginWithGooglePopup: async () => {
        await signInWithGooglePopup();
      },

      refreshAdminClaim: async () => {
        const claims = await refreshCurrentUserClaims();
        const isAdmin = claims.admin === true;
        set({ isAdmin });
        return isAdmin;
      },

      setGoogleUser: (userPayload, authMeta = {}) => {
        const emailKey = userPayload.email?.toLowerCase()?.trim() || userPayload.sub;
        const savedProfiles = get().savedProfiles || {};
        const existingProfile = savedProfiles[emailKey];

        const initialName = existingProfile?.name || (userPayload.name ? userPayload.name.split(' ')[0] : 'Gracz');
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
          mapStyle: existingProfile?.mapStyle || DEFAULT_MAP_STYLE_ID,
        };

        if (existingProfile && existingProfile.hasCompletedProfile) {
          set({
            authReady: true,
            authUid: authMeta.authUid || userPayload.sub || '',
            isAdmin: authMeta.isAdmin === true,
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
            mapStyle: existingProfile.mapStyle || DEFAULT_MAP_STYLE_ID,
            savedProfiles: {
              ...savedProfiles,
              [emailKey]: initialProfileData
            }
          });
        } else {
          set({
            authReady: true,
            authUid: authMeta.authUid || userPayload.sub || '',
            isAdmin: authMeta.isAdmin === true,
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
            mapStyle: DEFAULT_MAP_STYLE_ID,
            savedProfiles: {
              ...savedProfiles,
              [emailKey]: initialProfileData
            }
          });
        }
      },

      logout: async () => {
        await logoutUser();
        set({
          isLoggedIn: false,
          googleUser: null,
          authUid: '',
          isAdmin: false,
          email: '',
        });
      },

      completeProfileSetup: () => {
        const { googleUser, email, name, town, avatarId, car, stats, challengeAttempts, savedProfiles, hasCompletedOnboarding, hideEmail, isPremium, customAvatar, dailyGamesPlayed, onlineWins, onlineLosses, onlineDraws, mapStyle } = get();
        const emailKey = email?.toLowerCase()?.trim() || googleUser?.sub;

        const updatedProfileData = {
          email: email || googleUser?.email,
          name: name || 'Gracz',
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
          mapStyle: mapStyle || DEFAULT_MAP_STYLE_ID,
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
        return true;
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
            logoutUser();
            return {
              savedProfiles: newSaved,
              isLoggedIn: false,
              googleUser: null,
              authUid: '',
              isAdmin: false,
              email: '',
            };
          }

          return { savedProfiles: newSaved };
        });

        await deleteUserProfile(targetEmail);
      },
    }),
    {
      name: 'spotastreet-user-store-v3',
      version: 3,
      merge: (persistedState, currentState) => {
        const safeState = persistedState && typeof persistedState === 'object'
          ? persistedState
          : {};

        return {
          ...currentState,
          town: safeState.town || currentState.town,
          avatarId: safeState.avatarId || currentState.avatarId,
          car: safeState.car || currentState.car,
          hideEmail: safeState.hideEmail === true,
          customAvatar: safeState.customAvatar || null,
          mapStyle: safeState.mapStyle || currentState.mapStyle,
          savedProfiles: sanitizeSavedProfiles(safeState.savedProfiles),
        };
      },
      partialize: (state) => ({
        town: state.town,
        avatarId: state.avatarId,
        car: state.car,
        hideEmail: state.hideEmail,
        customAvatar: state.customAvatar,
        mapStyle: state.mapStyle,
        savedProfiles: sanitizeSavedProfiles(state.savedProfiles),
      }),
    }
  )
);

export default useUserProfile;
