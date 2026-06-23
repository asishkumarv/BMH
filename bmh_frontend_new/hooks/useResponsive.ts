import { useWindowDimensions } from 'react-native';

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    // Add dynamic layout sizes based on device
    sidebarWidth: isDesktop ? 250 : isTablet ? 80 : 0,
    headerHeight: 60,
    contentPadding: isDesktop ? 32 : isTablet ? 24 : 16,
  };
};
