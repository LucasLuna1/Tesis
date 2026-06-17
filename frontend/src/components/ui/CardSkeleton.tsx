import React from 'react';
import { Card, CardContent, Skeleton, Box } from '@mui/material';

interface CardSkeletonProps {
  count?: number;
}

const CardSkeleton: React.FC<CardSkeletonProps> = ({ count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Skeleton variant="text" width="60%" height={28} />
              <Skeleton variant="rounded" width={60} height={28} />
            </Box>
            <Skeleton variant="rounded" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={24} />
          </CardContent>
        </Card>
      ))}
    </>
  );
};

export default CardSkeleton;


