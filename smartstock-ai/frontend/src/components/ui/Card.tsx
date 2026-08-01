import * as React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "../../lib/utils"

export interface CardProps extends Omit<HTMLMotionProps<"div">, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"> {
  glass?: boolean
  onDrag?: React.DragEventHandler<HTMLDivElement>
  onDragStart?: React.DragEventHandler<HTMLDivElement>
  onDragEnd?: React.DragEventHandler<HTMLDivElement>
  onAnimationStart?: React.AnimationEventHandler<HTMLDivElement>
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, glass = false, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-xl border text-card-foreground shadow-sm bg-card",
          className
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        {...(props as any)}
      >
        <div className="relative z-10 h-full">{children as React.ReactNode}</div>
      </motion.div>
    )
  }
)
Card.displayName = "Card"

const KPICard = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => (
    <Card
      ref={ref}
      className={cn("p-6 flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-md", className)}
      {...props}
    >
      {children as React.ReactNode}
    </Card>
  )
)
KPICard.displayName = "KPICard"

export { Card, KPICard }
