import { Timestamp } from "firebase/firestore";

export interface Report {
  id: string;
  userId: string;
  description: string;
  corruptionType: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  evidenceBase64: string[];
  evidenceLinks: string[];
  status: "pending" | "approved" | "rejected";
  actionTaken?: string;
  userUpdates?: UserUpdate[];
  votes: {
    true: number;
    suspicious: number;
    needEvidence: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Comment {
  id: string;
  reportId: string;
  userId: string;
  text: string;
  parentId: string | null;
  createdAt: Timestamp;
}

export interface Vote {
  id: string;
  reportId: string;
  userId: string;
  type: "true" | "suspicious" | "needEvidence";
}

export interface UserProfile {
  uid: string;
  email: string;
  role: "user" | "admin";
  disabled: boolean;
  createdAt: Timestamp;
}

export interface UserUpdate {
  id: string;
  text: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Timestamp;
}

export const CORRUPTION_TYPES = [
  "সরকারি দুর্নীতি",
  "ঘুষ",
  "জমি দখল",
  "শিক্ষা খাতে দুর্নীতি",
  "স্বাস্থ্য খাতে দুর্নীতি",
  "পুলিশ দুর্নীতি",
  "আর্থিক জালিয়াতি",
  "ক্ষমতার অপব্যবহার",
  "অন্যান্য",
];
