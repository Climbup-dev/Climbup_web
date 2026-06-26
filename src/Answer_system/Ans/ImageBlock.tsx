"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import Image from "next/image";

export default function ImageBlock({
  block,
  url,
  src,
  alt,
  caption,
  searchQuery,
  recommendedWebsites,
}: any) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const imageUrl = block?.url || url || src || "";
  const imageTitle = block?.title || caption || alt || "Diagram";
  const imageAlt = block?.alt || alt || imageTitle || "Image";
  const imageSearchQuery =
    block?.search_query || block?.searchQuery || searchQuery || "";

  const imageRecommendedWebsites =
    block?.recommended_websites ||
    block?.recommendedWebsites ||
    recommendedWebsites ||
    [];

  const showFallback = !imageUrl || hasError;

  return (
    <div className="block image-block">
      {imageTitle && <h3 className="block-title">{imageTitle}</h3>}

      <div className="block-content">
        {showFallback ? (
          <div className="image-fallback-card">
            <div className="image-fallback-icon">Image</div>

            <div className="image-fallback-content">
              <div className="image-fallback-title">
                {hasError ? "Failed to load image" : "Image not available"}
              </div>

              {imageSearchQuery && (
                <div className="image-fallback-query">
                  Search: <code>{imageSearchQuery}</code>
                </div>
              )}

              {Array.isArray(imageRecommendedWebsites) &&
                imageRecommendedWebsites.length > 0 && (
                  <div className="image-fallback-sites">
                    Recommended: {imageRecommendedWebsites.join(", ")}
                  </div>
                )}
            </div>
          </div>
        ) : (
          <figure className="image-figure">
            {isLoading && (
              <div className="image-loading-placeholder">
                <div className="image-spinner" />
              </div>
            )}

            <div className="image-frame">
              <Image
                className={`answer-image ${isLoading ? "is-hidden" : ""}`}
                src={imageUrl}
                alt={imageAlt}
                fill
                sizes="(max-width: 768px) 96vw, (max-width: 1200px) 82vw, 1100px"
                unoptimized
                onError={() => {
                  setHasError(true);
                  setIsLoading(false);
                }}
                onLoad={() => setIsLoading(false)}
              />
            </div>

            {!isLoading && imageAlt && !hasError && (
              <figcaption className="image-caption">{imageAlt}</figcaption>
            )}
          </figure>
        )}
      </div>
    </div>
  );
}
