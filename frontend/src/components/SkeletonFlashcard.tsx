import React from 'react';

const SkeletonFlashcard: React.FC = () => {
    return (
        <div className="w-full max-w-2xl animate-pulse">
            <div className="bg-card rounded-xl shadow-lg p-8 mb-4 border">
                {/* Hint Skeleton */}
                <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-secondary/50"></div>
                        <div className="h-4 w-24 bg-secondary/50 rounded"></div>
                    </div>
                </div>

                {/* Sentence Skeleton */}
                <div className="mb-8 flex justify-center">
                    <div className="h-8 w-3/4 bg-secondary/50 rounded"></div>
                </div>

                {/* Feedback Area Skeleton */}
                <div className="h-12 flex items-center justify-center">
                    <div className="h-6 w-32 bg-secondary/50 rounded"></div>
                </div>

                {/* Translation and Submit Button Skeleton */}
                <div className="mt-6 pt-6 border-t border-border flex justify-between items-center">
                    <div className="h-6 w-1/2 bg-secondary/50 rounded"></div>
                    <div className="h-8 w-20 bg-secondary/50 rounded"></div>
                </div>
            </div>
        </div>
    );
};

export default SkeletonFlashcard;
