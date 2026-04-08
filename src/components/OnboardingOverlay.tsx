import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Map, MessageSquare, Calendar as CalendarIcon, Ticket, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const slides = [
  {
    id: "welcome",
    title: "Welcome to CampusMart",
    subtitle: "Your all-in-one campus companion",
    content: (
      <div className="relative w-full max-w-[240px] mx-auto aspect-[1/1.8] rounded-[2.5rem] border-[8px] border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col items-center justify-center p-6 before:absolute before:top-2 before:w-20 before:h-5 before:bg-border/50 before:rounded-full before:z-20">
        <Sparkles className="w-12 h-12 text-primary mb-6 animate-pulse" />
        <div className="w-full flex flex-col gap-3">
          <div className="w-full h-24 bg-primary/10 rounded-xl" />
          <div className="w-3/4 h-3 bg-muted rounded-full" />
          <div className="w-1/2 h-3 bg-muted rounded-full" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none" />
      </div>
    ),
  },
  {
    id: "discover",
    title: "Explore your campus",
    subtitle: "Find essential locations, lecture halls, and hot spots.",
    content: (
      <div className="relative w-full max-w-sm mx-auto aspect-square rounded-[2rem] bg-card/80 backdrop-blur border shadow-xl flex items-center justify-center p-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,theme(colors.primary.DEFAULT)_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.03] dark:opacity-[0.05]" />
        <Map className="w-32 h-32 text-muted absolute" strokeWidth={1} />
        <motion.div
          initial={{ y: 20, scale: 0 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="absolute z-10 w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg transform -translate-y-12"
        >
          📍
        </motion.div>
        <motion.div
          initial={{ y: -20, scale: 0 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ delay: 0.4, type: "spring" }}
          className="absolute z-10 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg transform translate-y-10 -translate-x-12"
        >
          📚
        </motion.div>
      </div>
    ),
  },
  {
    id: "connect",
    title: "Connect & Trade safely",
    subtitle: "Chat, collaborate, and trade securely within your campus.",
    content: (
      <div className="relative w-full max-w-sm mx-auto flex flex-col gap-4 p-2">
        <motion.div
          initial={{ x: -20, opacity: 0, scale: 0.9 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className="self-start bg-card/90 backdrop-blur border text-foreground p-4 rounded-2xl rounded-tl-sm max-w-[85%] shadow-md"
        >
          <p className="text-sm">Anyone selling a textbook for BIO101?</p>
        </motion.div>
        <motion.div
          initial={{ x: 20, opacity: 0, scale: 0.9 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: "spring" }}
          className="self-end bg-primary text-primary-foreground p-4 rounded-2xl rounded-tr-sm max-w-[85%] shadow-md"
        >
          <p className="text-sm">Yeah, I have one! Meet at the library?</p>
        </motion.div>
        <motion.div
          initial={{ x: -20, opacity: 0, scale: 0.9 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, type: "spring" }}
          className="self-start bg-card/90 backdrop-blur border text-foreground p-4 rounded-2xl rounded-tl-sm max-w-[85%] shadow-md flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4 text-primary" /> <p className="text-sm">Perfect!</p>
        </motion.div>
      </div>
    ),
  },
  {
    id: "academics",
    title: "Never miss a class",
    subtitle: "Manage your timetable, assignments, and campus life.",
    content: (
      <div className="relative w-full max-w-sm mx-auto flex flex-col gap-3">
        {[
          { title: "MTH101 Lecture", time: "09:00 AM - 11:00 AM", color: "bg-blue-500/10 text-blue-500" },
          { title: "BIO101 Practical", time: "01:00 PM - 03:00 PM", color: "bg-green-500/10 text-green-500" },
          { title: "Library Study Group", time: "04:00 PM - 05:00 PM", color: "bg-orange-500/10 text-orange-500" },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.15 + 0.1, type: "spring", bounce: 0.4 }}
            className="flex items-center gap-4 bg-card/80 backdrop-blur p-4 rounded-2xl border shadow-sm"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.color}`}>
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{item.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{item.time}</p>
            </div>
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    id: "events",
    title: "Discover campus events",
    subtitle: "Parties, meetups, study groups, and more.",
    content: (
      <div className="relative w-full max-w-sm mx-auto">
        <motion.div
          initial={{ y: 50, opacity: 0, rotate: -5 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
          className="bg-card/90 backdrop-blur rounded-[2rem] overflow-hidden border shadow-xl"
        >
          <div className="h-36 bg-gradient-to-br from-primary/20 to-purple-500/20 relative overflow-hidden flex items-center justify-center">
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity }}>
              <Ticket className="w-20 h-20 text-primary opacity-60 rotate-12" />
            </motion.div>
          </div>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-primary uppercase tracking-wider bg-primary/10 px-3 py-1 rounded-full">
                Coming Up
              </span>
              <span className="text-xs font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> 24h : 12m
              </span>
            </div>
            <h3 className="font-display font-bold text-lg leading-tight">Freshers' Welcome Party</h3>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              Join us for the biggest campus gathering of the semester.
            </p>
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: "cta",
    title: "Ready to jump in?",
    subtitle: "Your campus experience, upgraded.",
    content: (
      <div className="relative w-full h-full flex flex-col items-center justify-center py-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", bounce: 0.6 }}
          className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-primary to-primary/60 flex items-center justify-center shadow-2xl shadow-primary/30 z-10"
        >
          <Sparkles className="w-16 h-16 text-primary-foreground" />
          <motion.div
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full border-2 border-primary"
          />
        </motion.div>
      </div>
    ),
  },
];

export const OnboardingOverlay = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Show splash screen for 1-1.5 seconds, so we give it a tiny delay to not conflict with it visually immediately
    const checkOnboarding = () => {
      const hasSeen = localStorage.getItem("hasSeenOnboarding");
      if (!hasSeen) {
        setIsVisible(true);
        // Prevent scrolling while overlay is active
        document.body.style.overflow = "hidden";
      }
    };
    
    // Initial check
    const timer = setTimeout(checkOnboarding, 500);
    return () => clearTimeout(timer);
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    setIsVisible(false);
    document.body.style.overflow = "auto";
  };

  const nextSlide = () => {
    if (currentIndex === slides.length - 1) {
      completeOnboarding();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  if (!isVisible) return null;

  const currentSlide = slides[currentIndex];
  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
        className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-xl"
      >
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{
              cx: ["20%", "80%", "50%"],
              cy: ["20%", "80%", "50%"],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/20 blur-[120px] rounded-full mix-blend-multiply opacity-50"
          />
          <motion.div
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-primary/30 blur-[100px] rounded-full mix-blend-multiply opacity-40"
          />
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-6">
          <div className="flex gap-1.5">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? "w-6 bg-primary" : "w-2 bg-primary/20"
                }`}
              />
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={skipOnboarding}
            className="text-muted-foreground hover:text-foreground font-medium rounded-full"
          >
            Skip
          </Button>
        </div>

        {/* Content Area */}
        <div className="relative z-10 flex-1 flex flex-col px-6 pb-6 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col justify-center"
            >
              <div className="flex-1 flex items-center justify-center min-h-[300px]">
                {currentSlide.content}
              </div>

              <div className="mt-8 text-center shrink-0">
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-3xl sm:text-4xl font-display font-bold tracking-tight mb-3"
                >
                  {currentSlide.title}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-muted-foreground text-base sm:text-lg max-w-sm mx-auto"
                >
                  {currentSlide.subtitle}
                </motion.p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer / CTA */}
        <div className="relative z-10 p-6 pb-8 bg-gradient-to-t from-background via-background/80 to-transparent">
          <Button
            size="lg"
            onClick={nextSlide}
            className="w-full max-w-sm mx-auto flex rounded-2xl h-14 text-lg font-medium shadow-lg shadow-primary/25 transition-transform active:scale-[0.98]"
          >
            {isLastSlide ? "Get Started" : "Continue"}
            {!isLastSlide && <ChevronRight className="w-5 h-5 ml-2" />}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

