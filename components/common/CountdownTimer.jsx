"use client";
import React, { useState, useEffect } from "react";
import { SUBMISSION_DEADLINE } from "@/constants";

const CountdownTimer = ({
  targetDate = SUBMISSION_DEADLINE,
  size = "sm",
  className = "",
}) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const calculateTimeLeft = () => {
      const difference = target - new Date().getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const isLarge = size === "lg";

  const TimeUnit = ({ value, label }) => (
    <div className="flex flex-col items-center">
      <span
        className={
          isLarge
            ? "text-3xl font-semibold tabular-nums tracking-tight text-white"
            : "text-sm font-semibold tabular-nums text-white"
        }
      >
        {value.toString().padStart(2, "0")}
      </span>
      <span
        className={`uppercase tracking-widest text-zinc-500 ${
          isLarge ? "mt-1 text-[10px]" : "text-[9px]"
        }`}
      >
        {label}
      </span>
    </div>
  );

  const Separator = () => (
    <span
      aria-hidden="true"
      className={`text-zinc-600 ${isLarge ? "text-2xl" : "text-xs"}`}
    >
      :
    </span>
  );

  return (
    <div
      className={`flex items-start ${isLarge ? "gap-4" : "gap-2"} ${className}`}
      role="timer"
      aria-label={`Applications close in ${timeLeft.days} days, ${timeLeft.hours} hours, ${timeLeft.minutes} minutes`}
    >
      <TimeUnit value={timeLeft.days} label="Days" />
      <Separator />
      <TimeUnit value={timeLeft.hours} label="Hours" />
      <Separator />
      <TimeUnit value={timeLeft.minutes} label="Mins" />
      <Separator />
      <TimeUnit value={timeLeft.seconds} label="Secs" />
    </div>
  );
};

export default CountdownTimer;
