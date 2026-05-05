"use client";
import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, Link, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimelineItem {
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
  className?: string;
}

export default function RadialOrbitalTimeline({ timelineData, className }: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [centerOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const [orbitRadius, setOrbitRadius] = useState<number>(200);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    const updateRadius = () => {
      setOrbitRadius(window.innerWidth < 768 ? 130 : 200);
    };
    updateRadius();
    window.addEventListener('resize', updateRadius);
    return () => window.removeEventListener('resize', updateRadius);
  }, []);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const newState: Record<number, boolean> = {};
      Object.keys(prev).forEach((key) => { newState[parseInt(key)] = false; });
      newState[id] = !prev[id];

      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);
        const relatedItems = getRelatedItems(id);
        const newPulse: Record<number, boolean> = {};
        relatedItems.forEach((relId) => { newPulse[relId] = true; });
        setPulseEffect(newPulse);
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
    if (!autoRotate) return;
    const timer = setInterval(() => {
      setRotationAngle((prev) => Number(((prev + 0.3) % 360).toFixed(3)));
    }, 50);
    return () => clearInterval(timer);
  }, [autoRotate]);

  const centerViewOnNode = (nodeId: number) => {
    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;
    setRotationAngle(270 - targetAngle);
  };

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = orbitRadius;
    const radian = (angle * Math.PI) / 180;
    const x = radius * Math.cos(radian) + centerOffset.x;
    const y = radius * Math.sin(radian) + centerOffset.y;
    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(0.4, Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2)));
    return { x, y, angle, zIndex, opacity };
  };

  const getRelatedItems = (itemId: number): number[] => {
    const item = timelineData.find((i) => i.id === itemId);
    return item ? item.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    return getRelatedItems(activeNodeId).includes(itemId);
  };

  const getStatusLabel = (status: TimelineItem["status"]) => {
    if (status === "completed") return "Concluído";
    if (status === "in-progress") return "Em andamento";
    return "Pendente";
  };

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed": return "border" ;
      case "in-progress": return "border";
      case "pending": return "border";
      default: return "border";
    }
  };

  const getStatusInlineStyles = (status: TimelineItem["status"]): React.CSSProperties => {
    switch (status) {
      case "completed": return { background: 'rgba(139,183,175,0.15)', border: '1px solid rgba(139,183,175,0.35)', color: 'var(--teal)' };
      case "in-progress": return { background: 'rgba(244,249,157,0.1)', border: '1px solid rgba(244,249,157,0.35)', color: 'var(--neon)' };
      case "pending": return { background: 'rgba(139,183,175,0.05)', border: '1px solid rgba(139,183,175,0.15)', color: 'var(--text-muted)' };
      default: return { background: 'rgba(139,183,175,0.05)', border: '1px solid rgba(139,183,175,0.15)', color: 'var(--text-muted)' };
    }
  };

  return (
    <div
      className={`w-full flex flex-col items-center justify-center overflow-hidden ${className ?? 'h-screen'}`}
      style={{ background: 'var(--bg-void)' }}
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
        <div
          className="absolute w-full h-full flex items-center justify-center"
          ref={orbitRef}
          style={{
            perspective: "1000px",
            transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
          }}
        >
          {/* Central text */}
          <div className="absolute flex flex-col items-center justify-center z-10 text-center pointer-events-none" style={{ width: 180 }}>
            <div className="absolute w-28 h-28 rounded-full border border-white/10 animate-ping opacity-30" style={{ animationDelay: "0s", animationDuration: "3s" }} />
            <div className="absolute w-36 h-36 rounded-full border border-white/5 animate-ping opacity-20" style={{ animationDelay: "1s", animationDuration: "3s" }} />
            <span style={{
              fontFamily: '"ivypresto-display", "ivypresto-headline", Georgia, serif',
              fontWeight: 300,
              fontStyle: 'italic',
              fontSize: 'clamp(1.6rem, 5vw, 2.2rem)',
              lineHeight: 1.2,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}>
              Fases do<br />
              <span style={{ color: 'var(--teal)' }}>processo</span>
            </span>
          </div>

          {/* Orbit ring */}
          <div
            className="absolute rounded-full"
            style={{
              width: orbitRadius * 2,
              height: orbitRadius * 2,
              border: '1px solid rgba(139,183,175,0.12)',
            }}
          />

          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);
            const isPulsing = pulseEffect[item.id];
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                ref={(el) => { nodeRefs.current[item.id] = el; }}
                className="absolute transition-all duration-700 cursor-pointer"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px)`,
                  zIndex: isExpanded ? 200 : position.zIndex,
                  opacity: isExpanded ? 1 : position.opacity,
                }}
                onClick={(e) => { e.stopPropagation(); toggleItem(item.id); }}
              >

                {/* Node button */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 transform"
                  style={{
                    background: isExpanded
                      ? 'var(--neon)'
                      : isRelated
                      ? 'rgba(139,183,175,0.25)'
                      : 'var(--bg-surface)',
                    border: isExpanded
                      ? '2px solid var(--neon)'
                      : isRelated
                      ? '2px solid var(--teal)'
                      : '2px solid rgba(139,183,175,0.3)',
                    color: isExpanded ? '#071F20' : 'var(--teal)',
                    transform: isExpanded ? 'scale(1.5)' : 'scale(1)',
                    boxShadow: isExpanded ? '0 0 20px rgba(244,249,157,0.25)' : isRelated ? '0 0 10px rgba(139,183,175,0.15)' : 'none',
                  }}
                >
                  <Icon size={16} />
                </div>

                {/* Label */}
                <div
                  className="absolute top-12 whitespace-nowrap text-xs font-semibold tracking-wider transition-all duration-300"
                  style={{
                    left: '50%',
                    transform: `translateX(-50%)${isExpanded ? ' scale(1.25)' : ''}`,
                    color: isExpanded ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {item.title}
                </div>

                {/* Expanded card */}
                {isExpanded && (
                  <Card
                    className="absolute top-20 left-1/2 -translate-x-1/2 w-64 overflow-visible"
                    style={{
                      background: 'rgba(15,57,58,0.96)',
                      backdropFilter: 'blur(24px)',
                      border: '1px solid rgba(139,183,175,0.2)',
                      boxShadow: '0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,183,175,0.06)',
                      borderRadius: '16px',
                    }}
                  >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3" style={{ background: 'rgba(139,183,175,0.4)' }} />
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <Badge
                          className={`px-2 text-xs ${getStatusStyles(item.status)}`}
                          style={getStatusInlineStyles(item.status)}
                        >
                          {getStatusLabel(item.status)}
                        </Badge>
                        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{item.date}</span>
                      </div>
                      <CardTitle className="text-sm mt-2" style={{ color: 'var(--text-primary)' }}>{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <p>{item.content}</p>

                      <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(139,183,175,0.1)' }}>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="flex items-center" style={{ color: 'var(--teal)' }}>
                            <Zap size={10} className="mr-1" /> Progresso
                          </span>
                          <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{item.energy}%</span>
                        </div>
                        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(139,183,175,0.1)' }}>
                          <div className="h-full" style={{ width: `${item.energy}%`, background: 'linear-gradient(90deg, var(--teal), var(--neon))' }} />
                        </div>
                      </div>

                      {item.relatedIds.length > 0 && (
                        <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(139,183,175,0.1)' }}>
                          <div className="flex items-center mb-2">
                            <Link size={10} className="mr-1" style={{ color: 'var(--teal)' }} />
                            <h4 className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--teal)' }}>Fases conectadas</h4>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.relatedIds.map((relatedId) => {
                              const relatedItem = timelineData.find((i) => i.id === relatedId);
                              return (
                                <Button
                                  key={relatedId}
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center h-6 px-2 py-0 text-xs rounded-md"
                                  style={{
                                    border: '1px solid rgba(139,183,175,0.2)',
                                    background: 'transparent',
                                    color: 'var(--text-secondary)',
                                  }}
                                  onClick={(e) => { e.stopPropagation(); toggleItem(relatedId); }}
                                >
                                  {relatedItem?.title}
                                  <ArrowRight size={8} className="ml-1" style={{ color: 'var(--teal)' }} />
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
