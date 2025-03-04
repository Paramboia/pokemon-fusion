export interface Fusion {
  id: string;
  pokemon1Id: number;
  pokemon2Id: number;
  pokemon1Name?: string;
  pokemon2Name?: string;
  fusionName: string;
  fusionImage: string;
  isLocalFallback?: boolean;
  createdAt: string;
  likes?: number;
} 