import React, { useEffect, useRef, useState } from 'react';
import { enrichedSocket, id } from './socket';

const App = () => {
  const [ interaction, setInteraction ] = useState<string>();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current !== null && enrichedSocket.value.getContext() === undefined) {
      enrichedSocket.value.setContext(canvasRef.current.getContext('2d')!);

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
      <pre>User ID: { id.peek() }</pre>
      <pre>Nonce: { enrichedSocket.value.getNonce() }</pre>
      <pre>Interaction: { interaction }</pre>
    </>
  );
};

export default App;