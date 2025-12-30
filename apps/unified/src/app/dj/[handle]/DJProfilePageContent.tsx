"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Badge, Modal, Input, Textarea, ConfirmModal } from "@crowdstack/ui";
import { Radio, MapPin, Calendar, Users, Instagram, Globe, Image as ImageIcon, Video, Settings, Plus, Edit, Trash2, Loader2, Circle, X, Camera, Upload } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { DJFollowButton } from "@/components/DJFollowButton";
import { ShareButton } from "@/components/ShareButton";
import { MixEmbed } from "@/components/mix/MixEmbed";
import { EventCardRow } from "@/components/EventCardRow";
import type { DJ, Mix } from "@crowdstack/shared/types";

interface DJGalleryImage {
  id: string;
  dj_id: string;
  storage_path: string;
  thumbnail_path: string | null;
  caption: string | null;
  is_hero: boolean;
  display_order: number;
  created_at: string;
  imageUrl?: string | null;
}

interface DJVideo {
  id: string;
  dj_id: string;
  youtube_url: string;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  is_featured: boolean;
  display_order: number;
  created_at: string;
}

interface DJProfilePageContentProps {
  dj: DJ;
  mixes: Mix[];
  followerCount: number;
  upcomingEvents: Array<{
    id: string;
    slug: string;
    name: string;
    start_time: string;
    end_time: string | null;
    flier_url: string | null;
    venues: { name: string; city: string | null } | null;
    display_order: number;
    set_time: string | null;
    isLive?: boolean;
  }>;
  pastEvents: Array<{
    id: string;
    slug: string;
    name: string;
    start_time: string;
    flier_url: string | null;
  }>;
  gallery: DJGalleryImage[];
  videos: DJVideo[];
  heroImage: string | null;
}

export function DJProfilePageContent({
  dj,
  mixes: initialMixes,
  followerCount,
  upcomingEvents,
  pastEvents,
  gallery,
  videos: initialVideos,
  heroImage,
}: DJProfilePageContentProps) {
  const router = useRouter();
  const [canEditDJ, setCanEditDJ] = useState(false);
  const [manageRole, setManageRole] = useState<"admin" | "dj" | null>(null);
  const [mixes, setMixes] = useState<Mix[]>(initialMixes);
  const [videos, setVideos] = useState<DJVideo[]>(initialVideos);
  const [galleryImages, setGalleryImages] = useState<DJGalleryImage[]>(gallery);
  
  // Mix editing state
  const [showMixModal, setShowMixModal] = useState(false);
  const [editingMix, setEditingMix] = useState<Mix | null>(null);
  const [mixTitle, setMixTitle] = useState("");
  const [mixDescription, setMixDescription] = useState("");
  const [mixSoundcloudUrl, setMixSoundcloudUrl] = useState("");
  const [mixStatus, setMixStatus] = useState<"draft" | "published">("published");
  const [savingMix, setSavingMix] = useState(false);
  const [mixErrors, setMixErrors] = useState<Record<string, string>>({});
  const [fetchingMixMetadata, setFetchingMixMetadata] = useState(false);
  
  // Video editing state
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<DJVideo | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoYoutubeUrl, setVideoYoutubeUrl] = useState("");
  const [videoFeatured, setVideoFeatured] = useState(false);
  const [savingVideo, setSavingVideo] = useState(false);
  const [videoErrors, setVideoErrors] = useState<Record<string, string>>({});
  const [fetchingVideoMetadata, setFetchingVideoMetadata] = useState(false);
  
  // Gallery state
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<DJGalleryImage | null>(null);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryUploadError, setGalleryUploadError] = useState<string | null>(null);
  const [deleteConfirmMix, setDeleteConfirmMix] = useState<string | null>(null);
  const [deleteConfirmVideo, setDeleteConfirmVideo] = useState<string | null>(null);
  const [deleteConfirmGallery, setDeleteConfirmGallery] = useState<string | null>(null);
  const [deletingMix, setDeletingMix] = useState(false);
  const [deletingVideo, setDeletingVideo] = useState(false);
  const [deletingGallery, setDeletingGallery] = useState(false);
  
  // Avatar and cover image state
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(dj.profile_image_url);
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(heroImage);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  // Tab state
  type TabId = "events" | "mixes" | "videos" | "photos" | "history";
  const [activeTab, setActiveTab] = useState<TabId>("events");
  
  // Pagination state for infinite scroll
  const ITEMS_PER_PAGE = 10;
  const [mixesDisplayCount, setMixesDisplayCount] = useState(ITEMS_PER_PAGE);
  const [videosDisplayCount, setVideosDisplayCount] = useState(ITEMS_PER_PAGE);
  const [photosDisplayCount, setPhotosDisplayCount] = useState(ITEMS_PER_PAGE);
  const [historyDisplayCount, setHistoryDisplayCount] = useState(ITEMS_PER_PAGE);
  
  // Mix featured state (for modal)
  const [mixFeatured, setMixFeatured] = useState(false);
  
  // Featured replacement confirmation
  const [showFeaturedReplaceConfirm, setShowFeaturedReplaceConfirm] = useState(false);
  const [pendingFeaturedItem, setPendingFeaturedItem] = useState<{type: "mix" | "video", callback: () => void} | null>(null);

  // Get single featured items (max 1 per category)
  const featuredMix = mixes.find((m) => m.is_featured) || null;
  const featuredVideo = videos.find((v) => v.is_featured) || null;
  const featuredMixes = mixes.filter((m) => m.is_featured);
  const otherMixes = mixes.filter((m) => !m.is_featured);
  
  // Tab counts for badges
  const tabCounts = {
    events: upcomingEvents.length,
    mixes: mixes.length,
    videos: videos.length,
    photos: galleryImages.length,
    history: pastEvents.length,
  };

  // Check if user can edit this DJ profile
  useEffect(() => {
    const checkEditPermission = async () => {
      try {
        const res = await fetch(`/api/djs/${dj.id}/can-edit`);
        if (res.ok) {
          const data = await res.json();
          setCanEditDJ(data.canEdit === true);
          setManageRole(data.role || null);
        }
      } catch (error) {
        // Silently fail - user can't edit
      }
    };
    checkEditPermission();
  }, [dj.id]);

  // Get the correct manage URL based on user's role
  const getManageUrl = () => {
    if (manageRole === "admin") {
      return `/admin/djs/${dj.id}`;
    } else {
      return `/app/dj/profile`;
    }
  };

  // Get API URL suffix for djId if admin
  const getApiDjId = () => {
    if (manageRole === "admin") {
      return `?djId=${dj.id}`;
    }
    return "";
  };

  // Mix editing handlers
  const handleNewMix = () => {
    setEditingMix(null);
    setMixTitle("");
    setMixDescription("");
    setMixSoundcloudUrl("");
    setMixStatus("published");
    setMixFeatured(false);
    setMixErrors({});
    setShowMixModal(true);
  };

  const handleEditMix = (mix: Mix) => {
    setEditingMix(mix);
    setMixTitle(mix.title);
    setMixDescription(mix.description || "");
    setMixSoundcloudUrl(mix.soundcloud_url);
    setMixStatus(mix.status);
    setMixFeatured(mix.is_featured);
    setMixErrors({});
    setFetchingMixMetadata(false);
    setShowMixModal(true);
  };

  const handleSoundCloudUrlChange = async (url: string) => {
    setMixSoundcloudUrl(url);
    
    // Only fetch metadata if URL looks valid (accepts full URLs and shortlinks)
    const trimmed = url.trim();
    if (trimmed && (trimmed.includes("soundcloud.com") || trimmed.includes("on.soundcloud.com"))) {
      setFetchingMixMetadata(true);
      try {
        const response = await fetch(`/api/dj/mixes/metadata?url=${encodeURIComponent(trimmed)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.metadata) {
            setMixTitle(data.metadata.title || "");
            setMixDescription(data.metadata.description || "");
          }
        }
      } catch (error) {
        // Silently fail - user can still proceed
        console.error("Failed to fetch SoundCloud metadata:", error);
      } finally {
        setFetchingMixMetadata(false);
      }
    }
  };

  // Core save logic for mix (called after confirmation if needed)
  const executeSaveMix = async () => {
    setSavingMix(true);
    setMixErrors({});

    if (!mixSoundcloudUrl.trim()) {
      setMixErrors({ soundcloud_url: "SoundCloud URL is required" });
      setSavingMix(false);
      return;
    }

    try {
      const url = editingMix 
        ? `/api/dj/mixes/${editingMix.id}${getApiDjId()}`
        : `/api/dj/mixes${getApiDjId()}`;
      const method = editingMix ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soundcloud_url: mixSoundcloudUrl.trim(),
          ...(mixTitle.trim() ? { title: mixTitle.trim() } : {}),
          ...(mixDescription.trim() ? { description: mixDescription.trim() } : {}),
          status: mixStatus,
          is_featured: mixFeatured,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save mix");
      }

      // Fetch updated mixes and update local state
      try {
        const updatedResponse = await fetch(`/api/dj/mixes${getApiDjId()}`);
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json();
          const publishedMixes = (updatedData.mixes || []).filter((m: Mix) => m.status === "published");
          setMixes(publishedMixes);
        }
      } catch (fetchError) {
        console.error("Failed to fetch updated mixes:", fetchError);
        router.refresh();
      }

      setShowMixModal(false);
    } catch (error: any) {
      setMixErrors({ save: error.message });
    } finally {
      setSavingMix(false);
    }
  };

  const handleSaveMix = async () => {
    // Check if we need to confirm replacing an existing featured mix
    const isSettingFeatured = mixFeatured;
    const currentlyEditingIsFeatured = editingMix?.is_featured;
    
    // Show confirmation if: setting featured, not currently featured, and another featured exists
    if (isSettingFeatured && !currentlyEditingIsFeatured && featuredMix && featuredMix.id !== editingMix?.id) {
      setPendingFeaturedItem({
        type: "mix",
        callback: executeSaveMix,
      });
      setShowFeaturedReplaceConfirm(true);
      return;
    }
    
    await executeSaveMix();
  };

  const handleDeleteMix = async () => {
    if (!deleteConfirmMix) return;
    
    setDeletingMix(true);
    try {
      const response = await fetch(`/api/dj/mixes/${deleteConfirmMix}${getApiDjId()}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete mix");

      // Remove mix from local state
      setMixes(prevMixes => prevMixes.filter(m => m.id !== deleteConfirmMix));
      setDeleteConfirmMix(null);
    } catch (error) {
      console.error("Failed to delete mix:", error);
      alert("Failed to delete mix");
    } finally {
      setDeletingMix(false);
    }
  };

  // Video editing handlers
  const handleNewVideo = () => {
    setEditingVideo(null);
    setVideoTitle("");
    setVideoDescription("");
    setVideoYoutubeUrl("");
    setVideoFeatured(false);
    setVideoErrors({});
    setFetchingVideoMetadata(false);
    setShowVideoModal(true);
  };

  const handleEditVideo = (video: DJVideo) => {
    setEditingVideo(video);
    setVideoTitle(video.title || "");
    setVideoDescription(video.description || "");
    setVideoYoutubeUrl(video.youtube_url);
    setVideoFeatured(video.is_featured);
    setVideoErrors({});
    setFetchingVideoMetadata(false);
    setShowVideoModal(true);
  };

  const handleVideoUrlChange = async (url: string) => {
    setVideoYoutubeUrl(url);
    
    // Only fetch metadata if URL looks valid
    if (url.trim() && (url.includes("youtube.com") || url.includes("youtu.be"))) {
      setFetchingVideoMetadata(true);
      try {
        const response = await fetch(`/api/dj/videos/metadata?url=${encodeURIComponent(url.trim())}`);
        if (response.ok) {
          const data = await response.json();
          if (data.metadata) {
            setVideoTitle(data.metadata.title || "");
            setVideoDescription(data.metadata.description || "");
          }
        }
      } catch (error) {
        // Silently fail - user can still proceed
        console.error("Failed to fetch video metadata:", error);
      } finally {
        setFetchingVideoMetadata(false);
      }
    }
  };

  // Core save logic for video (called after confirmation if needed)
  const executeSaveVideo = async () => {
    setSavingVideo(true);
    setVideoErrors({});

    if (!videoYoutubeUrl.trim()) {
      setVideoErrors({ youtube_url: "YouTube URL is required" });
      setSavingVideo(false);
      return;
    }

    try {
      const url = editingVideo
        ? `/api/dj/videos/${editingVideo.id}${getApiDjId()}`
        : `/api/dj/videos${getApiDjId()}`;
      const method = editingVideo ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtube_url: videoYoutubeUrl.trim(),
          is_featured: videoFeatured,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save video");
      }

      // Fetch updated videos and update local state
      try {
        const updatedResponse = await fetch(`/api/dj/videos${getApiDjId()}`);
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json();
          setVideos(updatedData.videos || []);
        }
      } catch (fetchError) {
        console.error("Failed to fetch updated videos:", fetchError);
        router.refresh();
      }

      setShowVideoModal(false);
    } catch (error: any) {
      setVideoErrors({ save: error.message });
    } finally {
      setSavingVideo(false);
    }
  };

  const handleSaveVideo = async () => {
    // Check if we need to confirm replacing an existing featured video
    const isSettingFeatured = videoFeatured;
    const currentlyEditingIsFeatured = editingVideo?.is_featured;
    
    // Show confirmation if: setting featured, not currently featured, and another featured exists
    if (isSettingFeatured && !currentlyEditingIsFeatured && featuredVideo && featuredVideo.id !== editingVideo?.id) {
      setPendingFeaturedItem({
        type: "video",
        callback: executeSaveVideo,
      });
      setShowFeaturedReplaceConfirm(true);
      return;
    }
    
    await executeSaveVideo();
  };

  const handleDeleteVideo = async () => {
    if (!deleteConfirmVideo) return;
    
    setDeletingVideo(true);
    try {
      const response = await fetch(`/api/dj/videos/${deleteConfirmVideo}${getApiDjId()}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete video");

      // Remove video from local state
      setVideos(prevVideos => prevVideos.filter(v => v.id !== deleteConfirmVideo));
      setDeleteConfirmVideo(null);
    } catch (error) {
      console.error("Failed to delete video:", error);
      alert("Failed to delete video");
    } finally {
      setDeletingVideo(false);
    }
  };

  const handleDeleteGalleryImage = async () => {
    if (!deleteConfirmGallery) return;
    
    setDeletingGallery(true);
    try {
      const response = await fetch(`/api/dj/gallery/${deleteConfirmGallery}${getApiDjId()}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete image");

      // Remove image from local state
      setGalleryImages(prevImages => prevImages.filter(img => img.id !== deleteConfirmGallery));
      setDeleteConfirmGallery(null);
      // Also close lightbox if this image was selected
      if (selectedGalleryImage?.id === deleteConfirmGallery) {
        setSelectedGalleryImage(null);
      }
    } catch (error) {
      console.error("Failed to delete gallery image:", error);
      alert("Failed to delete image");
    } finally {
      setDeletingGallery(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploadingGallery(true);
    setGalleryUploadError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("caption", "");
    formData.append("is_hero", "false");

    try {
      const response = await fetch(`/api/dj/gallery${getApiDjId()}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload image");
      }

      // Fetch updated gallery and update local state
      try {
        const updatedResponse = await fetch(`/api/dj/gallery${getApiDjId()}`);
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json();
          const galleryWithUrls = (updatedData.gallery || []).map((img: any) => {
            // Helper to construct image URLs
            const getImageUrl = (storagePath: string | null | undefined): string | null => {
              if (!storagePath) return null;
              if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
                return storagePath;
              }
              if (storagePath.startsWith("data:")) {
                return storagePath;
              }
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
              const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
              if (projectRef) {
                return `https://${projectRef}.supabase.co/storage/v1/object/public/dj-images/${storagePath}`;
              }
              return storagePath;
            };
            return {
              ...img,
              imageUrl: getImageUrl(img.storage_path),
            };
          });
          setGalleryImages(galleryWithUrls);
        }
      } catch (fetchError) {
        console.error("Failed to fetch updated gallery:", fetchError);
        // Fallback to router refresh
        router.refresh();
      }

      setShowGalleryModal(false);
    } catch (error: any) {
      setGalleryUploadError(error.message);
    } finally {
      setUploadingGallery(false);
    }
  };

  // Avatar upload handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/dj/profile/avatar${getApiDjId()}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload avatar");
      }

      const data = await response.json();
      setCurrentAvatarUrl(data.avatar_url);
    } catch (error: any) {
      alert(error.message || "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  // Cover image upload handler
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be less than 10MB");
      return;
    }

    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/dj/profile/cover${getApiDjId()}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload cover image");
      }

      const data = await response.json();
      setCurrentCoverUrl(data.cover_url);
    } catch (error: any) {
      alert(error.message || "Failed to upload cover image");
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }
    }
  };

  // Format stats
  const formatCount = (count: number): string => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  const totalEvents = upcomingEvents.length + pastEvents.length;
  const stats = {
    followers: formatCount(followerCount),
    mixes: mixes.length.toString(),
    events: formatCount(totalEvents),
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000");
  const shareUrl = `${baseUrl}/dj/${dj.handle}`;

  return (
    <div className="min-h-screen relative">
      {/* Base background */}
      <div className="fixed inset-0 bg-void -z-20" />
      
      {/* Hero Background Image - Fades to black */}
      <div className="fixed inset-x-0 top-0 h-[450px] z-0 overflow-hidden">
        {currentCoverUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentCoverUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Gradient overlay - fades to void/black */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void/70 to-void" />
            <div className="absolute inset-0 bg-gradient-to-r from-void/30 via-transparent to-void/30" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-void/50 to-void" />
        )}
      </div>
      
      {/* Hidden file input for cover upload */}
      {canEditDJ && (
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverUpload}
          className="hidden"
        />
      )}

      {/* Main Content */}
      <div className="relative z-10 pt-24 pb-12 px-6 md:px-10 lg:px-16">
        <div className="max-w-7xl mx-auto">
            
          {/* Hero Section */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6 mb-8">
            {/* DJ Avatar */}
            <div className="relative h-24 w-24 lg:h-28 lg:w-28 rounded-2xl overflow-hidden bg-glass border border-border-subtle flex-shrink-0 mb-1 group/avatar">
              {currentAvatarUrl ? (
                <Image
                  src={currentAvatarUrl}
                  alt={dj.name}
                  fill
                  sizes="(max-width: 1024px) 96px, 112px"
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{dj.name[0].toUpperCase()}</span>
                </div>
              )}
              
              {/* Edit Avatar Overlay */}
              {canEditDJ && (
                <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </button>
                </>
              )}
            </div>
          
            {/* DJ Info - aligned to bottom of avatar */}
            <div className="flex-1 pb-1">
              <h1 className="page-title">
                {dj.name}
              </h1>
              <div className="flex items-center gap-4 mt-1">
                {dj.location && (
                  <div className="flex items-center gap-1.5 text-secondary">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{dj.location}</span>
                  </div>
                )}
              </div>
              {dj.genres && dj.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {dj.genres.map((genre) => (
                    <Badge 
                      key={genre} 
                      color="purple" 
                      variant="outline"
                      className="!text-[10px] !font-bold !uppercase !tracking-wider"
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons - aligned to bottom */}
            <div className="flex items-center gap-3 pb-1">
              <DJFollowButton djId={dj.id} initialFollowerCount={followerCount} />
              <ShareButton
                title={dj.name}
                text={dj.bio || undefined}
                url={shareUrl}
                iconOnly
              />
              {canEditDJ && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 px-3"
                    title={currentCoverUrl ? "Change Cover Image" : "Add Cover Image"}
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                  >
                    {uploadingCover ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ImageIcon className="h-4 w-4 mr-1.5" />
                        <span className="text-xs">{currentCoverUrl ? "Cover" : "Add Cover"}</span>
                      </>
                    )}
                  </Button>
                  <Link href={getManageUrl()}>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="Edit Profile Info"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Left Sidebar */}
            <aside className="w-full lg:w-80 flex-shrink-0 space-y-6">
              
              {/* Stats Card */}
              <Card padding="none">
                <div className="grid grid-cols-3 divide-x divide-border-subtle">
                  <div className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{stats.followers}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-accent-primary">Followers</p>
                  </div>
                  <div className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{stats.events}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-accent-primary">Events</p>
                  </div>
                  <div className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{stats.mixes}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-accent-primary">Mixes</p>
                  </div>
                </div>
              </Card>

              {/* About Section */}
              {dj.bio && (
                <div>
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-primary mb-3">About</h3>
                  <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">
                    {dj.bio}
                  </p>
                </div>
              )}

              {/* Social Links - Icon Only */}
              {(dj.instagram_url || dj.soundcloud_url || dj.mixcloud_url || dj.spotify_url || dj.youtube_url || dj.website_url) && (
                <div>
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-primary mb-3">Links</h3>
                  <div className="flex flex-wrap gap-2">
                    {dj.instagram_url && (
                      <a
                        href={dj.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 bg-glass border border-border-subtle rounded-xl hover:bg-white/10 hover:border-accent-primary/50 transition-all text-secondary hover:text-primary"
                        title="Instagram"
                      >
                        <Instagram className="h-5 w-5" />
                      </a>
                    )}
                    {dj.soundcloud_url && (
                      <a
                        href={dj.soundcloud_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 bg-glass border border-border-subtle rounded-xl hover:bg-white/10 hover:border-[#ff5500]/50 transition-all text-secondary hover:text-[#ff5500]"
                        title="SoundCloud"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.006-.057-.048-.1-.084-.1zm-.899.828c-.06 0-.091.037-.104.094L0 14.479l.165 1.308c.014.057.045.094.09.094s.089-.037.099-.094l.19-1.308-.19-1.334c-.01-.057-.044-.094-.09-.094l.012.002zm1.83-1.229c-.06 0-.12.037-.12.1l-.21 2.563.225 2.458c0 .06.045.09.105.09.061 0 .09-.03.105-.09l.239-2.458-.239-2.553c-.015-.074-.044-.11-.105-.11zm.945-.089c-.075 0-.135.06-.15.135l-.193 2.64.21 2.544c.016.077.075.138.149.138.075 0 .135-.061.15-.138l.24-2.544-.24-2.64c-.015-.075-.075-.135-.15-.135l-.016-.005zm1.155.36c-.005-.09-.075-.149-.159-.149-.09 0-.158.06-.164.149l-.217 2.43.2 2.563c.005.09.074.149.163.149.09 0 .16-.06.165-.149l.226-2.563-.214-2.43zm.809-1.709c-.101 0-.18.09-.18.181l-.21 3.957.187 2.563c0 .09.08.164.18.164.09 0 .18-.075.18-.165l.209-2.563-.209-3.956c-.015-.104-.089-.181-.18-.181h.023zm.944-.914c-.105 0-.195.09-.21.194l-.179 4.872.179 2.549c.015.104.105.179.21.179.104 0 .194-.075.209-.18l.194-2.549-.194-4.871c-.015-.105-.105-.195-.209-.195v.001zm.93-.12c-.12 0-.21.09-.225.21l-.164 4.992.165 2.518c.015.12.105.21.225.21.119 0 .209-.09.224-.21l.18-2.518-.18-4.992c-.015-.12-.105-.21-.225-.21l.01.001-.01-.001zm1.155-2.018c-.135 0-.24.105-.255.24l-.15 7.005.15 2.459c.015.135.12.24.256.24.135 0 .239-.105.254-.24l.166-2.459-.165-7.005c-.016-.135-.12-.24-.256-.24zm.809 0c-.15 0-.27.119-.27.27l-.134 6.974.134 2.459c0 .149.12.269.27.269.15 0 .27-.12.27-.27l.149-2.458-.149-6.974c0-.15-.12-.27-.27-.27zm.81 0c-.15 0-.27.12-.286.27l-.119 6.974.12 2.459c.014.149.134.269.284.269.15 0 .27-.12.285-.27l.135-2.458-.135-6.974c-.015-.15-.135-.27-.285-.27zm2.115-1.904c-.165 0-.3.135-.314.299l-.12 8.879.12 2.413c.014.165.149.3.314.3.164 0 .299-.135.314-.3l.135-2.413-.135-8.879c-.015-.165-.15-.3-.314-.3zm-.855.584c-.165 0-.3.12-.3.285l-.105 8.295.105 2.429c0 .165.135.285.3.285.164 0 .299-.12.299-.285l.12-2.429-.12-8.295c0-.165-.134-.285-.299-.285zm1.739-1.454c-.18 0-.33.15-.345.33l-.105 9.644.105 2.399c.015.18.165.33.345.33.18 0 .33-.15.345-.33l.12-2.399-.12-9.644c-.015-.18-.165-.33-.345-.33zm.84-.105c-.195 0-.345.15-.36.345l-.09 9.749.09 2.385c.015.194.165.344.36.344.194 0 .345-.15.359-.345l.105-2.384-.105-9.75c-.014-.194-.164-.344-.359-.344zm.855-.239c-.21 0-.375.166-.39.376l-.075 9.988.075 2.37c.015.21.18.376.39.376.21 0 .375-.166.39-.375l.09-2.371-.09-9.988c-.015-.21-.18-.376-.39-.376zm2.955-.764c-.074 0-.149.03-.209.075-.314-.18-.674-.284-1.049-.284-.105 0-.21.014-.3.029-.21.015-.374.195-.374.405l-.001 12.389c0 .21.165.39.375.42.029.006.029.006.044.006h1.514c1.125 0 2.04-.914 2.04-2.04V9.62c0-1.124-.914-2.039-2.04-2.039z"/>
                        </svg>
                      </a>
                    )}
                    {dj.mixcloud_url && (
                      <a
                        href={dj.mixcloud_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 bg-glass border border-border-subtle rounded-xl hover:bg-white/10 hover:border-[#5000ff]/50 transition-all text-secondary hover:text-[#5000ff]"
                        title="Mixcloud"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M1.57 12.569c0 2.327 1.751 4.262 4.07 4.508v-1.27c-1.604-.24-2.84-1.62-2.84-3.248 0-1.814 1.47-3.283 3.283-3.283.753 0 1.447.256 2.002.684v-1.484C7.29 8.097 6.416 7.9 5.493 7.9c-2.579 0-4.672 2.093-4.672 4.672l.75-.003zm5.55 4.615v-1.27c1.464-.21 2.593-1.469 2.593-2.987 0-1.666-1.35-3.016-3.016-3.016-.372 0-.73.07-1.062.195v1.485c.315-.172.678-.268 1.062-.268.906 0 1.64.735 1.64 1.64 0 .906-.735 1.64-1.64 1.64l-.328-.03v1.27c.11.008.218.016.329.016 1.93 0 3.508-1.507 3.608-3.405l1.242-.008c.11 1.868 1.66 3.35 3.574 3.35.11 0 .218-.008.328-.016v-1.27l-.328.03c-.906 0-1.64-.734-1.64-1.64 0-.905.734-1.64 1.64-1.64.384 0 .746.096 1.062.268v-1.485c-.332-.125-.69-.195-1.062-.195-1.666 0-3.016 1.35-3.016 3.016 0 1.518 1.13 2.777 2.593 2.987v1.27h-1.115c.165-.378.264-.79.264-1.226 0-1.814-1.47-3.283-3.283-3.283-.753 0-1.447.255-2.002.683v1.485c.398-.341.916-.55 1.482-.55.906 0 1.64.735 1.64 1.64 0 .437-.099.848-.264 1.226H7.12zm10.44-4.615c0 2.579-2.093 4.672-4.672 4.672-.923 0-1.797-.197-2.591-.577v-1.484c.555.428 1.249.684 2.002.684 1.814 0 3.283-1.469 3.283-3.283 0-1.63-1.236-3.008-2.84-3.248v-1.27c2.319.245 4.07 2.18 4.07 4.508l-.251-.002z"/>
                        </svg>
                      </a>
                    )}
                    {dj.spotify_url && (
                      <a
                        href={dj.spotify_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 bg-glass border border-border-subtle rounded-xl hover:bg-white/10 hover:border-[#1db954]/50 transition-all text-secondary hover:text-[#1db954]"
                        title="Spotify"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                      </a>
                    )}
                    {dj.youtube_url && (
                      <a
                        href={dj.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 bg-glass border border-border-subtle rounded-xl hover:bg-white/10 hover:border-[#ff0000]/50 transition-all text-secondary hover:text-[#ff0000]"
                        title="YouTube"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      </a>
                    )}
                    {dj.website_url && (
                      <a
                        href={dj.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-10 h-10 bg-glass border border-border-subtle rounded-xl hover:bg-white/10 hover:border-accent-primary/50 transition-all text-secondary hover:text-primary"
                        title="Website"
                      >
                        <Globe className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 space-y-8">
              {/* Featured Content Row - Above tabs, Mix + Video side by side on desktop */}
              {(featuredMix || featuredVideo) && (
                <div>
                  <h2 className="section-header">Featured</h2>
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Featured Mix - flexible width */}
                    {featuredMix && (
                      <div className="flex-1 min-w-0">
                        <MixEmbed 
                          soundcloudUrl={featuredMix.soundcloud_url} 
                          title={featuredMix.title}
                        />
                      </div>
                    )}

                    {/* Featured Video - fixed width based on 166px height at 16:9 */}
                    {featuredVideo && (() => {
                      const videoId = featuredVideo.youtube_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
                      return (
                        <div className="w-full lg:w-[295px] flex-shrink-0">
                          <Card className="p-0 overflow-hidden">
                            <div className="relative w-full h-[166px] bg-black">
                              {videoId ? (
                                <iframe
                                  src={`https://www.youtube.com/embed/${videoId}`}
                                  title={featuredVideo.title || "DJ Video"}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  className="w-full h-full"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Video className="h-12 w-12 text-white/20" />
                                </div>
                              )}
                            </div>
                          </Card>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Tab Navigation */}
              <nav className="flex gap-4 sm:gap-6 border-b border-border-subtle overflow-x-auto pb-px">
                {[
                  { id: "events" as TabId, label: "EVENTS", count: upcomingEvents.length },
                  { id: "mixes" as TabId, label: "MIXES", count: mixes.length },
                  { id: "videos" as TabId, label: "VIDEOS", count: videos.length },
                  { id: "photos" as TabId, label: "PHOTOS", count: galleryImages.length },
                  { id: "history" as TabId, label: "HISTORY", count: pastEvents.length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`tab-label whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === tab.id ? "tab-label-active" : "tab-label-inactive"
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="text-[10px] font-mono text-secondary">({tab.count})</span>
                    )}
                  </button>
                ))}
              </nav>

              {/* EVENTS Tab */}
              {activeTab === "events" && (
                <div className="space-y-8">
                  {/* Upcoming Events */}
                  {upcomingEvents.length > 0 && (
                    <div>
                      <h2 className="section-header">Upcoming Events</h2>
                      <div className="space-y-3">
                        {upcomingEvents.map((event) => (
                          event.isLive ? (
                            // Live event with glowing edges from design system
                            <div key={event.id} className="relative">
                              <div className="absolute -inset-1 bg-gradient-to-r from-accent-error via-accent-warning to-accent-error rounded-xl blur-sm opacity-40 animate-pulse" />
                              <div className="relative">
                                <EventCardRow
                                  event={{
                                    id: event.id,
                                    name: event.name,
                                    slug: event.slug,
                                    start_time: event.start_time,
                                    end_time: event.end_time,
                                    flier_url: event.flier_url,
                                    venue: event.venues ? { name: event.venues.name, city: event.venues.city } : null,
                                  }}
                                  isLive
                                  isUpcoming={false}
                                />
                              </div>
                            </div>
                          ) : (
                            // Regular upcoming event
                            <EventCardRow
                              key={event.id}
                              event={{
                                id: event.id,
                                name: event.name,
                                slug: event.slug,
                                start_time: event.start_time,
                                end_time: event.end_time,
                                flier_url: event.flier_url,
                                venue: event.venues ? { name: event.venues.name, city: event.venues.city } : null,
                              }}
                              isUpcoming
                            />
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state for events tab */}
                  {upcomingEvents.length === 0 && !featuredMix && !featuredVideo && (
                    <Card className="p-8 text-center border-dashed">
                      <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60">No upcoming events</p>
                    </Card>
                  )}
                </div>
              )}

              {/* MIXES Tab */}
              {activeTab === "mixes" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="section-header">All Mixes</h2>
                    {canEditDJ && (
                      <Button variant="secondary" size="sm" onClick={handleNewMix}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Mix
                      </Button>
                    )}
                  </div>
                  
                  {mixes.length === 0 && canEditDJ ? (
                    <Card className="p-8 text-center border-dashed">
                      <Radio className="h-12 w-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">No mixes yet</p>
                      <Button onClick={handleNewMix}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Mix
                      </Button>
                    </Card>
                  ) : mixes.length === 0 ? (
                    <Card className="p-8 text-center border-dashed">
                      <Radio className="h-12 w-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60">No mixes published yet</p>
                    </Card>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {mixes.slice(0, mixesDisplayCount).map((mix) => (
                          <div key={mix.id} className="relative group">
                            {canEditDJ && (
                              <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={(e) => {
                                    if (e) {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }
                                    handleEditMix(mix);
                                  }}
                                  className="h-7 w-7 p-0"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={(e) => {
                                    if (e) {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }
                                    setDeleteConfirmMix(mix.id);
                                  }}
                                  className="h-7 w-7 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            <MixEmbed 
                              soundcloudUrl={mix.soundcloud_url} 
                              title={mix.title}
                            />
                          </div>
                        ))}
                      </div>
                      {mixesDisplayCount < mixes.length && (
                        <button
                          onClick={() => setMixesDisplayCount(prev => prev + ITEMS_PER_PAGE)}
                          className="w-full py-3 rounded-xl bg-glass border border-border-subtle text-sm font-semibold text-primary hover:bg-active hover:border-accent-primary/30 transition-colors"
                        >
                          Load More Mixes
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Old sections hidden - now in tabs */}
              {false && (
              <>
              {/* All Mixes */}
              {((featuredMixes.length > 0 && otherMixes.length > 0) || (featuredMixes.length === 0 && mixes.length > 0) || canEditDJ) && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="section-header">
                      {featuredMixes.length > 0 ? "All Mixes" : "Mixes"}
                    </h2>
                    {canEditDJ && (
                      <Button variant="secondary" size="sm" onClick={handleNewMix}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Mix
                      </Button>
                    )}
                  </div>
                  {otherMixes.length === 0 && featuredMixes.length === 0 && canEditDJ ? (
                    <Card className="p-8 text-center border-dashed">
                      <Radio className="h-12 w-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">No mixes yet</p>
                      <Button onClick={handleNewMix}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Mix
                      </Button>
                    </Card>
                  ) : otherMixes.length === 0 ? (
                    <div className="text-center py-8 text-white/60">
                      <p>No other mixes</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {otherMixes.map((mix) => (
                        <div key={mix.id} className="relative group">
                          {canEditDJ && (
                            <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                  if (e) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }
                                  handleEditMix(mix);
                                }}
                                className="h-7 w-7 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                  if (e) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }
                                  setDeleteConfirmMix(mix.id);
                                }}
                                className="h-7 w-7 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          <MixEmbed 
                            soundcloudUrl={mix.soundcloud_url} 
                            title={mix.title}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Gallery Section */}
              {(galleryImages.length > 0 || canEditDJ) && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="section-header">Gallery</h2>
                    {canEditDJ && (
                      <Button variant="secondary" size="sm" onClick={() => setShowGalleryModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Photos
                      </Button>
                    )}
                  </div>
                  {galleryImages.length === 0 && canEditDJ ? (
                    <Card className="p-8 text-center border-dashed">
                      <ImageIcon className="h-12 w-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">No photos yet</p>
                      <Button onClick={() => setShowGalleryModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Photo
                      </Button>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {galleryImages.map((image) => {
                        if (!image.imageUrl) return null;
                        
                        return (
                          <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer">
                            <Image
                              src={image.imageUrl}
                              alt={image.caption || "Gallery image"}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform"
                              onClick={() => setSelectedGalleryImage(image)}
                            />
                            {canEditDJ && (
                              <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={(e) => {
                                    if (e) {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }
                                    setDeleteConfirmGallery(image.id);
                                  }}
                                  className="h-7 w-7 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            {image.caption && (
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                                <p className="text-white text-sm line-clamp-2">{image.caption}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Videos Section */}
              {(videos.length > 0 || canEditDJ) && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="section-header">
                      {videos.filter(v => v.is_featured).length > 0 ? "Featured Videos" : "Videos"}
                    </h2>
                    {canEditDJ && (
                      <Button variant="secondary" size="sm" onClick={handleNewVideo}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Video
                      </Button>
                    )}
                  </div>
                  {videos.length === 0 && canEditDJ ? (
                    <Card className="p-8 text-center border-dashed">
                      <Video className="h-12 w-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">No videos yet</p>
                      <Button onClick={handleNewVideo}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Video
                      </Button>
                    </Card>
                  ) : (
                    <>
                      {videos.filter(v => v.is_featured).length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                          {videos.filter(v => v.is_featured).map((video) => {
                            const videoId = video.youtube_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
                            return (
                              <div key={video.id} className="relative group">
                                {canEditDJ && (
                                  <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={(e) => {
                                        if (e) {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }
                                        handleEditVideo(video);
                                      }}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={(e) => {
                                        if (e) {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }
                                        setDeleteConfirmVideo(video.id);
                                      }}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                                <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                                  {videoId ? (
                                    <iframe
                                      src={`https://www.youtube.com/embed/${videoId}`}
                                      title={video.title || "DJ Video"}
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                      className="w-full h-full"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Video className="h-12 w-12 text-white/20" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {videos.filter(v => !v.is_featured).length > 0 && (
                        <>
                          <h3 className="section-header">All Videos</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {videos.filter(v => !v.is_featured).map((video) => {
                              const videoId = video.youtube_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
                              return (
                                <div key={video.id} className="relative group">
                                  {canEditDJ && (
                                    <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                      onClick={(e) => {
                                        if (e) {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }
                                        handleEditVideo(video);
                                      }}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                      onClick={(e) => {
                                        if (e) {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }
                                        setDeleteConfirmVideo(video.id);
                                      }}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                                    {videoId ? (
                                      <iframe
                                        src={`https://www.youtube.com/embed/${videoId}`}
                                        title={video.title || "DJ Video"}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="w-full h-full"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Video className="h-12 w-12 text-white/20" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
              </>
              )}

              {/* VIDEOS Tab */}
              {activeTab === "videos" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="section-header">All Videos</h2>
                    {canEditDJ && (
                      <Button variant="secondary" size="sm" onClick={handleNewVideo}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Video
                      </Button>
                    )}
                  </div>
                  
                  {videos.length === 0 && canEditDJ ? (
                    <Card className="p-8 text-center border-dashed">
                      <Video className="h-12 w-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">No videos yet</p>
                      <Button onClick={handleNewVideo}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Video
                      </Button>
                    </Card>
                  ) : videos.length === 0 ? (
                    <Card className="p-8 text-center border-dashed">
                      <Video className="h-12 w-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60">No videos published yet</p>
                    </Card>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {videos.slice(0, videosDisplayCount).map((video) => {
                          const videoId = video.youtube_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
                          return (
                            <div key={video.id} className="relative group">
                              {canEditDJ && (
                                <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={(e) => {
                                      if (e) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }
                                      handleEditVideo(video);
                                    }}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={(e) => {
                                      if (e) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }
                                      setDeleteConfirmVideo(video.id);
                                    }}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                                {videoId ? (
                                  <iframe
                                    src={`https://www.youtube.com/embed/${videoId}`}
                                    title={video.title || "DJ Video"}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="w-full h-full"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Video className="h-12 w-12 text-white/20" />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {videosDisplayCount < videos.length && (
                        <button
                          onClick={() => setVideosDisplayCount(prev => prev + ITEMS_PER_PAGE)}
                          className="w-full py-3 rounded-xl bg-glass border border-border-subtle text-sm font-semibold text-primary hover:bg-active hover:border-accent-primary/30 transition-colors"
                        >
                          Load More Videos
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* PHOTOS Tab */}
              {activeTab === "photos" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="section-header">Gallery</h2>
                    {canEditDJ && (
                      <Button variant="secondary" size="sm" onClick={() => setShowGalleryModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Photos
                      </Button>
                    )}
                  </div>
                  
                  {galleryImages.length === 0 && canEditDJ ? (
                    <Card className="p-8 text-center border-dashed">
                      <ImageIcon className="h-12 w-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">No photos yet</p>
                      <Button onClick={() => setShowGalleryModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Photos
                      </Button>
                    </Card>
                  ) : galleryImages.length === 0 ? (
                    <Card className="p-8 text-center border-dashed">
                      <ImageIcon className="h-12 w-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60">No photos published yet</p>
                    </Card>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {galleryImages.slice(0, photosDisplayCount).map((image) => (
                          <div 
                            key={image.id} 
                            className="relative aspect-square rounded-lg overflow-hidden bg-glass group cursor-pointer"
                            onClick={() => setSelectedGalleryImage(image)}
                          >
                            {image.imageUrl ? (
                              <Image
                                src={image.imageUrl}
                                alt={image.caption || "Gallery image"}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-white/20" />
                              </div>
                            )}
                            {canEditDJ && (
                              <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={(e) => {
                                    e?.stopPropagation();
                                    setDeleteConfirmGallery(image.id);
                                  }}
                                  className="h-7 w-7 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {photosDisplayCount < galleryImages.length && (
                        <button
                          onClick={() => setPhotosDisplayCount(prev => prev + ITEMS_PER_PAGE)}
                          className="w-full py-3 rounded-xl bg-glass border border-border-subtle text-sm font-semibold text-primary hover:bg-active hover:border-accent-primary/30 transition-colors"
                        >
                          Load More Photos
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* HISTORY Tab */}
              {activeTab === "history" && (
                <div className="space-y-6">
                  <h2 className="section-header">Past Events</h2>
                  
                  {pastEvents.length === 0 ? (
                    <Card className="p-8 text-center border-dashed">
                      <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/60">No past events yet</p>
                    </Card>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {pastEvents.slice(0, historyDisplayCount).map((event) => (
                          <EventCardRow
                            key={event.id}
                            event={{
                              id: event.id,
                              name: event.name,
                              slug: event.slug,
                              start_time: event.start_time,
                              flier_url: event.flier_url,
                            }}
                            isPast
                            isUpcoming={false}
                          />
                        ))}
                      </div>
                      {historyDisplayCount < pastEvents.length && (
                        <button
                          onClick={() => setHistoryDisplayCount(prev => prev + ITEMS_PER_PAGE)}
                          className="w-full py-3 rounded-xl bg-glass border border-border-subtle text-sm font-semibold text-primary hover:bg-active hover:border-accent-primary/30 transition-colors"
                        >
                          Load More Events
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* Mix Edit Modal */}
      <Modal
        isOpen={showMixModal}
        onClose={() => setShowMixModal(false)}
        title={editingMix ? "Edit Mix" : "Add Mix"}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowMixModal(false)} disabled={savingMix}>
              Cancel
            </Button>
            <Button onClick={handleSaveMix} disabled={savingMix} loading={savingMix}>
              {editingMix ? "Save Changes" : "Add Mix"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              SoundCloud URL <span className="text-red-400">*</span>
            </label>
            <Input
              value={mixSoundcloudUrl}
              onChange={(e) => handleSoundCloudUrlChange(e.target.value)}
              placeholder="https://soundcloud.com/... or on.soundcloud.com/..."
              className={mixErrors.soundcloud_url ? "border-red-400" : ""}
            />
            {mixErrors.soundcloud_url && (
              <p className="text-red-400 text-xs mt-1">{mixErrors.soundcloud_url}</p>
            )}
            {fetchingMixMetadata && (
              <p className="text-xs text-secondary mt-1 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Fetching track information...
              </p>
            )}
          </div>

          {mixTitle && (
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Title</label>
              <Input
                value={mixTitle}
                disabled
                className="bg-glass/50 opacity-75"
              />
              <p className="text-xs text-secondary mt-1">Fetched from SoundCloud</p>
            </div>
          )}

          {mixDescription && (
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Description</label>
              <Textarea
                value={mixDescription}
                disabled
                rows={4}
                className="bg-glass/50 opacity-75"
              />
              <p className="text-xs text-secondary mt-1">Fetched from SoundCloud</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-primary mb-2">Status</label>
            <select
              value={mixStatus}
              onChange={(e) => setMixStatus(e.target.value as "draft" | "published")}
              className="w-full px-3 py-2 bg-glass border border-border-subtle rounded-lg text-white"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="mixFeatured"
              checked={mixFeatured}
              onChange={(e) => setMixFeatured(e.target.checked)}
              className="w-4 h-4 rounded border-border-subtle bg-glass text-accent-primary focus:ring-accent-primary"
            />
            <label htmlFor="mixFeatured" className="text-sm font-medium text-primary">
              Feature this mix
            </label>
          </div>
          <p className="text-xs text-secondary -mt-2">Featured mix appears on your Events tab. Only 1 mix can be featured.</p>

          {mixErrors.save && (
            <div className="p-4 bg-red-400/10 border border-red-400/20 rounded-lg">
              <p className="text-red-400 text-sm">{mixErrors.save}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Video Edit Modal */}
      <Modal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        title={editingVideo ? "Edit Video" : "Add Video"}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowVideoModal(false)} disabled={savingVideo}>
              Cancel
            </Button>
            <Button onClick={handleSaveVideo} disabled={savingVideo} loading={savingVideo}>
              {editingVideo ? "Save Changes" : "Add Video"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              YouTube URL <span className="text-red-400">*</span>
            </label>
            <Input
              value={videoYoutubeUrl}
              onChange={(e) => handleVideoUrlChange(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
              className={videoErrors.youtube_url ? "border-red-400" : ""}
            />
            {videoErrors.youtube_url && (
              <p className="text-red-400 text-xs mt-1">{videoErrors.youtube_url}</p>
            )}
            {fetchingVideoMetadata && (
              <p className="text-xs text-secondary mt-1 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Fetching video information...
              </p>
            )}
          </div>

          {videoTitle && (
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Title</label>
              <Input
                value={videoTitle}
                disabled
                className="bg-glass/50 opacity-75"
              />
              <p className="text-xs text-secondary mt-1">Fetched from YouTube</p>
            </div>
          )}

          {videoDescription && (
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Description</label>
              <Textarea
                value={videoDescription}
                disabled
                rows={4}
                className="bg-glass/50 opacity-75"
              />
              <p className="text-xs text-secondary mt-1">Fetched from YouTube</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="video-featured"
              checked={videoFeatured}
              onChange={(e) => setVideoFeatured(e.target.checked)}
              className="w-4 h-4 rounded border-border-subtle"
            />
            <label htmlFor="video-featured" className="text-sm text-primary">
              Feature this video
            </label>
          </div>

          {videoErrors.save && (
            <div className="p-4 bg-red-400/10 border border-red-400/20 rounded-lg">
              <p className="text-red-400 text-sm">{videoErrors.save}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Gallery Lightbox Modal */}
      {selectedGalleryImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedGalleryImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-white/80 p-2 z-10"
            onClick={() => setSelectedGalleryImage(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <div className="relative max-w-7xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <Image
              src={selectedGalleryImage.imageUrl || ""}
              alt={selectedGalleryImage.caption || "Gallery image"}
              width={1920}
              height={1080}
              className="max-w-full max-h-[90vh] object-contain"
            />
            {selectedGalleryImage.caption && (
              <p className="text-white text-center mt-4">{selectedGalleryImage.caption}</p>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modals */}
      <ConfirmModal
        isOpen={deleteConfirmMix !== null}
        onClose={() => setDeleteConfirmMix(null)}
        onConfirm={handleDeleteMix}
        title="Delete Mix"
        message="Are you sure you want to delete this mix? This action cannot be undone."
        variant="danger"
        confirmText="Delete"
        cancelText="Cancel"
        loading={deletingMix}
      />

      <ConfirmModal
        isOpen={deleteConfirmVideo !== null}
        onClose={() => setDeleteConfirmVideo(null)}
        onConfirm={handleDeleteVideo}
        title="Delete Video"
        message="Are you sure you want to delete this video? This action cannot be undone."
        variant="danger"
        confirmText="Delete"
        cancelText="Cancel"
        loading={deletingVideo}
      />

      <ConfirmModal
        isOpen={deleteConfirmGallery !== null}
        onClose={() => setDeleteConfirmGallery(null)}
        onConfirm={handleDeleteGalleryImage}
        title="Delete Photo"
        message="Are you sure you want to delete this photo? This action cannot be undone."
        variant="danger"
        confirmText="Delete"
        cancelText="Cancel"
        loading={deletingGallery}
      />

      {/* Featured Replacement Confirmation Modal */}
      <ConfirmModal
        isOpen={showFeaturedReplaceConfirm}
        onClose={() => {
          setShowFeaturedReplaceConfirm(false);
          setPendingFeaturedItem(null);
        }}
        onConfirm={async () => {
          setShowFeaturedReplaceConfirm(false);
          if (pendingFeaturedItem?.callback) {
            await pendingFeaturedItem.callback();
          }
          setPendingFeaturedItem(null);
        }}
        title={`Replace Featured ${pendingFeaturedItem?.type === "mix" ? "Mix" : "Video"}?`}
        message={`You already have a featured ${pendingFeaturedItem?.type}. Do you want to replace it with this one? Only one ${pendingFeaturedItem?.type} can be featured at a time.`}
        variant="warning"
        confirmText="Replace"
        cancelText="Cancel"
      />
    </div>
  );
}

