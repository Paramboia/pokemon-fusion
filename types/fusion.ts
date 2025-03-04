export interface Fusion {
  id: string;
  pokemon1Id: number;
  pokemon2Id: number;
  fusionName: string;
  fusionImage: string;
  isLocalFallback?: boolean;
  createdAt: string;
  likes?: number;
} 