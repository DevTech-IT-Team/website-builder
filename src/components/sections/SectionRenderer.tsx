import React from 'react';
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { ServicesSection } from './ServicesSection';
import { CTASection } from './CTASection';
import { TestimonialsSection } from './TestimonialsSection';
import { PricingSection } from './PricingSection';
import { GallerySection } from './GallerySection';
import { GalleryMasonrySection } from './GalleryMasonrySection';
import { BlogListSection } from './BlogListSection';
import { sanitizeHTML } from '@/utils/sanitize';
import { CaseStudiesSection } from './CaseStudiesSection';
import { ContactSection } from './ContactSection';
import { StatsSection } from './StatsSection';
import { TeamSection } from './TeamSection';
import { FAQSection } from './FAQSection';
import { LogoCloudSection } from './LogoCloudSection';
import { ContentSection } from './ContentSection';
import { AboutSection } from './AboutSection';
import { LayoutSection } from './LayoutSection';
import { TextBlock } from './TextBlock';
import { ButtonBlock } from './ButtonBlock';
import { HTMLBlock } from './HTMLBlock';
import { useBuilder } from '@/contexts/BuilderContext';
import { FloatingComponent } from './FloatingComponent';
import { isJunkFloatingComponent } from '@/builder/templatePieces';

export function SectionRenderer({ section, idx, isAlternate, isSelected, isEditing, onContentChange }) {
  const { updateComponent, deleteComponent, selectComponent, selectSection, moveComponent, state } = useBuilder();
  const { editor } = state;

  const commonProps = { section, isSelected, isEditing, onContentChange, isAlternate };

  const renderBaseSection = () => {
    switch (section.type) {
      case 'hero': return <HeroSection {...commonProps} />;
      case 'features': return <FeaturesSection {...commonProps} />;
      case 'services': return <ServicesSection {...commonProps} />;
      case 'casestudies': return <CaseStudiesSection {...commonProps} />;
      case 'cta': return <CTASection {...commonProps} />;
      case 'testimonials': return <TestimonialsSection {...commonProps} />;
      case 'pricing': return <PricingSection {...commonProps} />;
      case 'gallery': return <GallerySection {...commonProps} />;
      case 'gallery-masonry': return <GalleryMasonrySection {...commonProps} />;
      case 'blog': return <BlogListSection {...commonProps} />;
      case 'contact': return <ContactSection {...commonProps} />;
      case 'stats': return <StatsSection {...commonProps} />;
      case 'team': return <TeamSection {...commonProps} />;
      case 'faq': return <FAQSection {...commonProps} />;
      case 'logocloud': return <LogoCloudSection {...commonProps} />;
      case 'content': return <ContentSection {...commonProps} />;
      case 'about': return <AboutSection {...commonProps} />;
      case 'layout': return <LayoutSection {...commonProps} />;
      case 'text': return <TextBlock {...commonProps} />;
      case 'button': return <ButtonBlock {...commonProps} />;
      case 'html': return <HTMLBlock {...commonProps} />;
      default: return <div className="p-10 text-center">Section: {section.name}</div>;
    }
  };

  const slugId = (section.name || section.type).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  return (
    <div id={slugId} data-section-id={section.id} data-section-kind="prebuilt" className="relative group/section">
      {renderBaseSection()}

      {!editor.previewMode && (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          {(section.components || []).filter((comp) => !isJunkFloatingComponent(comp)).map((comp) => (
            <div key={comp.id} className="pointer-events-auto">
              <FloatingComponent
                component={comp}
                section={section}
                isSelected={editor.selectedComponentId === comp.id}
                isEditing={isEditing}
                editor={editor}
                updateComponent={updateComponent}
                deleteComponent={deleteComponent}
                selectComponent={selectComponent}
                selectSection={selectSection}
                moveComponent={moveComponent}
              />
            </div>
          ))}
        </div>
      )}
      {editor.previewMode && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {(section.components || []).map((comp) => (
            <div
              key={comp.id}
              style={{
                position: 'absolute',
                left: `${(comp.position.x / 1200) * 100}%`,
                top: `${(comp.position.y / 600) * 100}%`,
                zIndex: comp.style?.zIndex || 10,
                ...(comp.style || {}),
              }}
            >
              {comp.type === 'text' && (
                <div
                  style={{
                    color: comp.style?.color || 'inherit',
                    fontSize: comp.style?.fontSize || '24px',
                    fontWeight: comp.style?.fontWeight || 'normal',
                    fontFamily: comp.style?.fontFamily || 'Inter',
                    fontStyle: comp.style?.fontStyle || 'normal',
                  }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(comp.content.text) }}
                />
              )}
              {comp.type === 'image' && (
                <img
                  src={comp.content.imageUrl}
                  style={{
                    width: comp.style?.width || 'auto',
                    borderRadius: comp.style?.borderRadius || '0px',
                  }}
                />
              )}
              {comp.type === 'button' && (
                <button
                  style={{
                    padding: '12px 24px',
                    borderRadius: comp.style?.borderRadius || '8px',
                    backgroundColor: comp.style?.backgroundColor || '#3b82f6',
                    background: comp.style?.background || 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    color: comp.style?.color || '#ffffff',
                    fontSize: comp.style?.fontSize || '16px',
                    fontWeight: comp.style?.fontWeight || '600',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(comp.content.text) }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
