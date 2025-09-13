import React, { useState, useEffect } from 'react';
import EmojiPicker, { EmojiClickData, EmojiStyle, Theme } from 'emoji-picker-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTheme } from 'next-themes';

interface EmojiPickerComponentProps {
  selectedEmoji: string;
  onEmojiSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function EmojiPickerComponent({ 
  selectedEmoji, 
  onEmojiSelect, 
  trigger,
  size = 'md' 
}: EmojiPickerComponentProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  // Load recent emojis from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentEmojis');
    if (stored) {
      setRecentEmojis(JSON.parse(stored));
    }
  }, []);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const emoji = emojiData.emoji;
    onEmojiSelect(emoji);
    
    // Update recent emojis
    const updatedRecent = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 12);
    setRecentEmojis(updatedRecent);
    localStorage.setItem('recentEmojis', JSON.stringify(updatedRecent));
    
    setIsOpen(false);
  };

  const EmojiPickerContent = () => (
    <div className="w-full max-w-sm">
      {recentEmojis.length > 0 && (
        <div className="p-3 border-b border-border">
          <h4 className="text-sm font-medium text-foreground mb-2">Recently Used</h4>
          <div className="grid grid-cols-6 gap-1">
            {recentEmojis.map((emoji, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-muted"
                onClick={() => handleEmojiClick({ emoji } as EmojiClickData)}
              >
                <span className="text-lg">{emoji}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
      <EmojiPicker
        onEmojiClick={handleEmojiClick}
        emojiStyle={EmojiStyle.NATIVE}
        theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
        searchDisabled={false}
        width="100%"
        height={300}
        previewConfig={{
          showPreview: false
        }}
        searchPlaceHolder="Search emojis..."
        skinTonesDisabled={false}
        lazyLoadEmojis={true}
      />
    </div>
  );

  const defaultTrigger = (
    <Button
      variant="outline"
      className={`
        ${size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10'} 
        p-0 border-2 border-dashed border-border hover:border-primary transition-colors
      `}
    >
      <span className={`${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'}`}>
        {selectedEmoji || '😀'}
      </span>
    </Button>
  );

  // Detect mobile for responsive design
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || defaultTrigger}
        </DialogTrigger>
        <DialogContent className="glass-card border-border p-0 max-w-sm">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-foreground">Choose Emoji</DialogTitle>
          </DialogHeader>
          <EmojiPickerContent />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent 
        className="glass-card border-border p-0 w-auto" 
        align="start"
        side="bottom"
        sideOffset={5}
      >
        <EmojiPickerContent />
      </PopoverContent>
    </Popover>
  );
}

export default EmojiPickerComponent;