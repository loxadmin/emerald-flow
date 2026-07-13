"use client";
import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, Link, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: React.ElementType;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
}

export default function RadialOrbitalTimeline({
  timelineData,
}: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>(
    {}
  );
  const [viewMode, setViewMode] = useState<"orbital">("orbital");
  const [rotationAngle, setRotationAngle] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [centerOffset, setCenterOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        if (parseInt(key) !== id) {
          newState[parseInt(key)] = false;
        }
      });

      newState[id] = !prev[id];

      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);

        const relatedItems = getRelatedItems(id);
        const newPulseEffect: Record<number, boolean> = {};
        relatedItems.forEach((relId) => {
          newPulseEffect[relId] = true;
        });
        setPulseEffect(newPulseEffect);

        centerViewOnNode(id);
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
      }

      return newState;
    });
  };

  useEffect(() => {
    let rotationTimer: any;

    if (autoRotate && viewMode === "orbital") {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => {
          const newAngle = (prev + 0.3) % 360;
          return Number(newAngle.toFixed(3));
        });
      }, 50);
    }

    return () => {
      if (rotationTimer) {
        clearInterval(rotationTimer);
      }
    };
  }, [autoRotate, viewMode]);

  const centerViewOnNode = (nodeId: number) => {
    if (viewMode !== "orbital" || !nodeRefs.current[nodeId]) return;

    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;

    setRotationAngle(270 - targetAngle);
  };

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = 120; // Adjusted smaller radius to fit nice and responsive in container
    const radian = (angle * Math.PI) / 180;

    const x = radius * Math.cos(radian) + centerOffset.x;
    const y = radius * Math.sin(radian) + centerOffset.y;

    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(
      0.4,
      Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2))
    );

    return { x, y, angle, zIndex, opacity };
  };

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    const relatedItems = getRelatedItems(activeNodeId);
    return relatedItems.includes(itemId);
  };

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed":
        return "text-white bg-black border-white";
      case "in-progress":
        return "text-black bg-white border-black";
      case "pending":
        return "text-white bg-black/40 border-white/50";
      default:
        return "text-white bg-black/40 border-white/50";
    }
  };

  return (
     <div
       ref={containerRef}
       onClick={handleContainerClick}
       className="relative w-full h-[400px] flex items-center justify-center overflow-visible select-none"
     >
       {/* Background orbit lines */}
       <div
         ref={orbitRef}
         className="absolute w-[240px] h-[240px] rounded-full border border-primary/20 pointer-events-none flex items-center justify-center"
       >
         <div className="w-[180px] h-[180px] rounded-full border border-dashed border-primary/10" />
         <div className="w-[100px] h-[100px] rounded-full border border-primary/5" />
       </div>

       {/* Active connections or general energy hub in the center */}
       <div className="absolute w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center pointer-events-none">
         <Zap className={`h-5 w-5 text-primary ${autoRotate ? "animate-pulse" : "animate-bounce"}`} />
       </div>

       {timelineData.map((item, index) => {
         const position = calculateNodePosition(index, timelineData.length);
         const isExpanded = expandedItems[item.id];
         const isRelated = isRelatedToActive(item.id);
         const isPulsing = pulseEffect[item.id];
         const Icon = item.icon;

         const nodeStyle = {
           transform: `translate(${position.x}px, ${position.y}px)`,
           zIndex: isExpanded ? 200 : position.zIndex,
           opacity: isExpanded ? 1 : position.opacity,
         };

         return (
           <div
             key={item.id}
             ref={(el) => (nodeRefs.current[item.id] = el)}
             className="absolute transition-all duration-700 cursor-pointer"
             style={nodeStyle}
             onClick={(e) => {
               e.stopPropagation();
               toggleItem(item.id);
             }}
           >
             {/* Node circle */}
             <div
               className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-500 hover:scale-110 ${
                 isExpanded
                   ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30"
                   : isRelated
                   ? "bg-primary/20 border-primary text-primary animate-pulse"
                   : "bg-card border-border text-foreground hover:border-primary/50"
               }`}
             >
               <Icon className="h-4 w-4" />

               {isPulsing && (
                 <span className="absolute inline-flex h-full w-full rounded-full bg-primary/30 animate-ping pointer-events-none" />
               )}
             </div>

             {/* Simple Title label under the circle */}
             {!isExpanded && (
               <div className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-background/90 backdrop-blur-sm border border-border px-2 py-0.5 rounded text-[10px] font-semibold text-muted-foreground shadow-sm">
                 {item.title}
               </div>
             )}

             {isExpanded && (
               <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 w-[240px] pointer-events-auto">
                 <Card className="border border-primary/30 bg-card/95 backdrop-blur-lg shadow-xl shadow-primary/10">
                   <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                     <Badge
                       variant="outline"
                       className={`text-[9px] px-1.5 py-0.5 font-bold ${getStatusStyles(item.status)}`}
                     >
                       {item.status === "completed"
                         ? "COMPLETE"
                         : item.status === "in-progress"
                         ? "IN PROGRESS"
                         : "PENDING"}
                     </Badge>
                     <span className="text-[10px] text-muted-foreground font-mono">{item.date}</span>
                   </CardHeader>
                   <CardContent className="p-3 pt-1">
                     <CardTitle className="text-sm font-bold text-foreground mb-1">
                       {item.title}
                     </CardTitle>
                     <p className="text-xs text-muted-foreground leading-normal mb-2">
                       {item.content}
                     </p>

                     <div className="flex items-center justify-between border-t border-border/40 pt-1.5 mt-1.5">
                       <div className="flex items-center gap-1">
                         <Zap className="h-3 w-3 text-primary animate-pulse" />
                         <span className="text-[10px] font-medium text-muted-foreground">
                           Progress
                         </span>
                       </div>
                       <span className="text-[10px] font-bold text-foreground font-mono">
                         {item.energy}%
                       </span>
                     </div>

                     {item.relatedIds.length > 0 && (
                       <div className="mt-2 border-t border-border/40 pt-1.5">
                         <div className="flex items-center gap-1 mb-1">
                           <Link className="h-3 w-3 text-primary" />
                           <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                             Connected Nodes
                           </span>
                         </div>
                         <div className="flex flex-wrap gap-1">
                           {item.relatedIds.map((relatedId) => {
                             const relatedItem = timelineData.find(
                               (i) => i.id === relatedId
                             );
                             return (
                               <button
                                 key={relatedId}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   toggleItem(relatedId);
                                 }}
                                 className="inline-flex items-center gap-0.5 text-[9px] bg-secondary hover:bg-secondary/80 text-foreground px-1.5 py-0.5 rounded transition-colors"
                               >
                                 {relatedItem?.title}
                                 <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                               </button>
                             );
                           })}
                         </div>
                       </div>
                     )}
                   </CardContent>
                 </Card>
               </div>
             )}
           </div>
         );
       })}
     </div>
  );
}
