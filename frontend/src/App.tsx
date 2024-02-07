import React, { useEffect, useRef, useState } from 'react';
import { context, nonce, enrichedSocket } from './socket';

const App = () => {
  const [ interaction, setInteraction ] = useState<string>();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current !== null && context.value === undefined) {
      context.value = canvasRef.current.getContext('2d')!;

      enrichedSocket.value.addCallback((interaction) => setInteraction(interaction.message));
    }
  }, [canvasRef]);

  return (
    <>
      <canvas id='dummyid' ref={ canvasRef } />
      <div className='table'>
        <div>&nbsp;</div>
        <div><button className='move' onClick={ () => enrichedSocket.value.move('up') }>UP</button></div>
        <div>&nbsp;</div>
        <div><button className='move' onClick={ () => enrichedSocket.value.move('left') }>LEFT</button></div>
        <div><button className='interact' onClick={ () => enrichedSocket.value.interact() }>INTERACT</button></div>
        <div><button className='move' onClick={ () => enrichedSocket.value.move('right') }>RIGHT</button></div>
        <div>&nbsp;</div>
        <div><button className='move' onClick={ () => enrichedSocket.value.move('down') }>DOWN</button></div>
        <div>&nbsp;</div>
      </div>
      <pre>Nonce: { nonce }</pre>
      <pre>Interaction: { interaction }</pre>
    </>
  );
};

export default App;