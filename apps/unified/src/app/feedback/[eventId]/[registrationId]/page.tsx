"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button, Card, Textarea, Checkbox, LoadingSpinner, useToast } from "@crowdstack/ui";
import { Star, CheckCircle2, AlertCircle } from "lucide-react";

interface Event {
  id: string;
  name: string;
  description?: string;
  start_time?: string;
  venue?: {
    id: string;
    name: string;
  } | null;
}

interface FeedbackCategory {
  id: string;
  code: string;
  label: string;
}

export default function FeedbackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.eventId as string;
  const registrationId = params.registrationId as string;
  const token = searchParams.get("token");
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [step, setStep] = useState<"rating" | "positive" | "negative">("rating");
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [categories, setCategories] = useState<FeedbackCategory[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load feedback form state and categories
  useEffect(() => {
    const loadData = async () => {
      if (!token) {
        setError("Missing feedback token");
        setLoading(false);
        return;
      }

      try {
        // Load feedback form state
        const response = await fetch(
          `/api/feedback/${eventId}/${registrationId}?token=${token}`
        );

        if (!response.ok) {
          if (response.status === 410) {
            setError("This feedback link has expired.");
          } else if (response.status === 404) {
            setError("Invalid feedback link.");
          } else {
            setError("Failed to load feedback form.");
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setEvent(data.event);
        setHasSubmitted(data.hasSubmitted);

        if (data.hasSubmitted) {
          setStep("rating");
          setRating(data.feedback.rating);
        }

        // Load feedback categories
        const categoriesResponse = await fetch("/api/feedback/categories");
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData.categories || []);
        }
      } catch (err) {
        console.error("Error loading feedback form:", err);
        setError("Failed to load feedback form.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId, registrationId, token]);

  const handleRatingSelect = (selectedRating: number) => {
    setRating(selectedRating);
    
    // Auto-advance to next step after a brief delay
    setTimeout(() => {
      if (selectedRating >= 4) {
        setStep("positive");
      } else {
        setStep("negative");
      }
    }, 300);
  };

  const handleCategoryToggle = (categoryCode: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryCode)
        ? prev.filter((c) => c !== categoryCode)
        : [...prev, categoryCode]
    );
  };

  const handleSubmit = async () => {
    if (!rating || !token) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registrationId,
          eventId,
          token,
          rating,
          comment: step === "positive" ? comment : null,
          categories: step === "negative" ? selectedCategories : [],
          freeText: step === "negative" ? freeText : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit feedback");
      }

      setHasSubmitted(true);
      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted successfully.",
        variant: "success",
      });
    } catch (err: any) {
      console.error("Error submitting feedback:", err);
      setError(err.message || "Failed to submit feedback. Please try again.");
      toast({
        title: "Error",
        description: err.message || "Failed to submit feedback.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <div className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Unable to Load Feedback</h1>
            <p className="text-secondary">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (hasSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
        <Card className="max-w-md w-full">
          <div className="p-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Thank You!</h1>
            <p className="text-secondary mb-4">
              Your feedback has been submitted. We appreciate you taking the time to share your experience.
            </p>
            {event && (
              <div className="mt-6 pt-6 border-t border-border-subtle">
                <p className="text-sm text-secondary">
                  Event: <span className="font-medium text-primary">{event.name}</span>
                </p>
                {event.venue && (
                  <p className="text-sm text-secondary mt-1">
                    Venue: <span className="font-medium text-primary">{event.venue.name}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
      <Card className="max-w-2xl w-full">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {step === "rating" && "How was your experience?"}
              {step === "positive" && "Glad you enjoyed it!"}
              {step === "negative" && "Thanks for being honest"}
            </h1>
            {event && (
              <p className="text-secondary">
                {event.name}
                {event.venue && ` at ${event.venue.name}`}
              </p>
            )}
          </div>

          {/* Step 1: Star Rating */}
          {step === "rating" && (
            <div className="space-y-6">
              <p className="text-center text-lg text-secondary mb-8">
                Thanks for attending! How would you rate your experience?
              </p>
              <div className="flex justify-center gap-2 mb-8">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingSelect(star)}
                    className="transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg p-2"
                    aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`h-16 w-16 ${
                        rating && star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300 dark:text-gray-600"
                      } transition-colors duration-200`}
                    />
                  </button>
                ))}
              </div>
              {rating && (
                <p className="text-center text-sm text-secondary">
                  {rating === 5 && "Excellent!"}
                  {rating === 4 && "Great!"}
                  {rating === 3 && "Good"}
                  {rating === 2 && "Fair"}
                  {rating === 1 && "Poor"}
                </p>
              )}
            </div>
          )}

          {/* Step 2a: Positive Feedback */}
          {step === "positive" && (
            <div className="space-y-6">
              <p className="text-center text-lg text-secondary mb-6">
                Want to leave a quick comment for the venue?
              </p>
              <Textarea
                placeholder="Your feedback helps venues improve..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full"
              />
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep("rating");
                    setComment("");
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  loading={submitting}
                  className="flex-1"
                >
                  Submit Feedback
                </Button>
              </div>
            </div>
          )}

          {/* Step 2b: Negative Feedback */}
          {step === "negative" && (
            <div className="space-y-6">
              <p className="text-center text-lg text-secondary mb-6">
                What could have been better?
              </p>

              {/* Categories */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-primary">
                  Select categories (optional):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={category.code}
                        checked={selectedCategories.includes(category.code)}
                        onCheckedChange={() => handleCategoryToggle(category.code)}
                      />
                      <label
                        htmlFor={category.code}
                        className="text-sm text-secondary cursor-pointer flex-1"
                      >
                        {category.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Free text */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary">
                  Additional details (optional):
                </label>
                <Textarea
                  placeholder="Tell us more about your experience..."
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  rows={4}
                  className="w-full"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep("rating");
                    setSelectedCategories([]);
                    setFreeText("");
                    setError(null);
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  loading={submitting}
                  className="flex-1"
                >
                  Submit Feedback
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
