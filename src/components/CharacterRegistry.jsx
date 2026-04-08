import React, { useState } from 'react';
import { useFlowStore } from '../store/useFlowStore';
import CharacterCard from './CharacterCard';
import { UserPlus } from 'lucide-react';

function generateId() {
  return `char-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function CharacterRegistry() {
  const { characters, addCharacter } = useFlowStore();

  const handleAdd = () => {
    addCharacter({
      id: generateId(),
      name: 'New Character',
      role: 'Supporting',
      locked: false,
      lockedDescriptor: '',
      costumePerAct: { act1: '', act2: '', act3: '' },
      arc: { act1: '', act2: '', act3: '' },
      portraitId: null,
    });
  };

  return (
    <div className="char-registry">
      <div className="char-registry-header">
        <span className="char-registry-title">Character Registry</span>
        <button className="char-add-btn" onClick={handleAdd}>
          <UserPlus size={14} /> Add Character
        </button>
      </div>

      {characters.length === 0 ? (
        <div className="char-registry-empty">
          <p>No characters yet.</p>
          <p>Chat with the Director AI and characters will be extracted automatically, or add them manually.</p>
        </div>
      ) : (
        <div className="char-registry-list">
          {characters.map(char => (
            <CharacterCard key={char.id} character={char} />
          ))}
        </div>
      )}
    </div>
  );
}
