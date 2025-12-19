import React from 'react';

const SkeletonFlashcard: React.FC = () => {
    return (
        <div className="w-full max-w-2xl animate-pulse">
            <div className="bg-white rounded-2xl border border-[#E6E6E3] shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-8 mb-4">
                {/* Hint Skeleton */}
                <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#F2F0EF]"></div>
                        <div className="h-4 w-24 bg-[#F2F0EF] rounded"></div>
                    </div>
                </div>

                {/* Sentence Skeleton */}
                <div className="mb-8 flex justify-center">
                    <div className="h-8 w-3/4 bg-[#F2F0EF] rounded"></div>
                </div>

                {/* Feedback Area Skeleton */}
                <div className="h-12 flex items-center justify-center">
                    <div className="h-6 w-32 bg-[#F2F0EF] rounded"></div>
                </div>

                {/* Translation and Submit Button Skeleton */}
                <div className="mt-6 pt-6 border-t border-dashed border-[#E6E6E3] flex justify-between items-center">
                    <div className="h-5 w-1/2 bg-[#F2F0EF] rounded"></div>
                    <div className="h-10 w-24 bg-[#F2F0EF] rounded-xl"></div>
                </div>
            </div>
        </div>
    );
};

export default SkeletonFlashcard;
