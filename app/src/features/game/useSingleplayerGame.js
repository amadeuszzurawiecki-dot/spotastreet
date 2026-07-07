import { useTimer } from '../../hooks/useTimer';

export function useSingleplayerGame({
  hasSubmittedRef,
  onTimerExpire,
  roundDuration,
  setIsGameOver,
  setIsRoundActive,
  setShowResult,
}) {
  const timer = useTimer(roundDuration, onTimerExpire);

  const handleExitGame = () => {
    if (!window.confirm('Czy na pewno chcesz zakończyć grę? Stracisz dotychczasowy postęp.')) return;
    timer.stop();
    window.location.assign('/');
  };

  const finishGame = () => {
    timer.stop();
    hasSubmittedRef.current = true;
    setIsRoundActive(false);
    setShowResult(false);
    setIsGameOver(true);
  };

  return {
    ...timer,
    finishGame,
    handleExitGame,
  };
}

export default useSingleplayerGame;
