import { useState, useCallback } from "react";
import type { ProfileData, Module } from "@/types";

const STORAGE_KEY = "trpg-profile";

const defaultProfile: ProfileData = {
  name: "Lucius",
  avatar: "",
  bio: "TRPG 爱好者，擅长主持各类模组。",
  disclaimer:
    "参与跑团即视为同意以下规则：尊重其他玩家，配合KP推进剧情，不恶意PVP。如遇不适内容请及时提出。",
  modules: [],
};

function loadProfile(): ProfileData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ProfileData;
  } catch {
    // ignore parse errors
  }
  return { ...defaultProfile };
}

function saveProfile(data: ProfileData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useProfileStore() {
  const [profile, setProfileState] = useState<ProfileData>(loadProfile);

  const setProfile = useCallback((data: ProfileData) => {
    setProfileState(data);
    saveProfile(data);
  }, []);

  const updateProfile = useCallback(
    (partial: Partial<ProfileData>) => {
      setProfileState((prev) => {
        const next = { ...prev, ...partial };
        saveProfile(next);
        return next;
      });
    },
    []
  );

  const addModule = useCallback((mod: Module) => {
    setProfileState((prev) => {
      const next = { ...prev, modules: [...prev.modules, mod] };
      saveProfile(next);
      return next;
    });
  }, []);

  const updateModule = useCallback((id: string, partial: Partial<Module>) => {
    setProfileState((prev) => {
      const next = {
        ...prev,
        modules: prev.modules.map((m) =>
          m.id === id ? { ...m, ...partial, updatedAt: new Date().toISOString() } : m
        ),
      };
      saveProfile(next);
      return next;
    });
  }, []);

  const removeModule = useCallback((id: string) => {
    setProfileState((prev) => {
      const next = { ...prev, modules: prev.modules.filter((m) => m.id !== id) };
      saveProfile(next);
      return next;
    });
  }, []);

  return {
    profile,
    setProfile,
    updateProfile,
    addModule,
    updateModule,
    removeModule,
  };
}
