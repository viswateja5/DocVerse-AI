import { motion } from "framer-motion"
import type { HTMLMotionProps } from "framer-motion"

interface SkeletonProps extends HTMLMotionProps<"div"> {
  className?: string
}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{
        repeat: Infinity,
        repeatType: "reverse",
        duration: 1,
        ease: "easeInOut"
      }}
      className={`bg-muted/50 rounded-xl ${className}`}
      {...props}
    />
  )
}
