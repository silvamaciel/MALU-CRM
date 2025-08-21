import React, { useEffect, useState } from 'react';
import {
  getIndexadoresApi, createIndexadorApi, upsertValorIndexadorApi,
  listarCredoresApi
} from '../../../api/financeiroApi';
import { toast } from 'react-toastify';
import CriarCredorModal from './CriarCredorModal';
import { FiPlusCircle, FiSave } from 'react-icons/fi';

export default function AdmFinanceiroTab() {
  const [indexadores, setIndexadores] = useState([]);
  const [novoNome, setNovoNome] = useState('');
  const [valorMes, setValorMes] = useState({ indexadorId:'', mesAno:'', valor:'' });
  const [credores, setCredores] = useState([]);
  const [modalCredor, setModalCredor] = useState(false);

  const load = async () => {
    try {
      const [idx, cr] = await Promise.all([getIndexadoresApi(), listarCredoresApi()]);
      setIndexadores(idx || []);
      setCredores(cr || []);
    } catch (e) {
      toast.error('Falha ao carregar ADM Financeiro.');
    }
  };

  useEffect(()=>{ load(); },[]);

  const criarIndexador = async () => {
    if (!novoNome.trim()) return;
    try {
      await createIndexadorApi({ nome: novoNome.trim() });
      toast.success('Indexador criado!');
      setNovoNome('');
      load();
    } catch (e) {
      toast.error('Falha ao criar indexador.');
    }
  };

  const salvarValor = async (e) => {
    e.preventDefault();
    try {
      const { indexadorId, mesAno, valor } = valorMes;
      await upsertValorIndexadorApi(indexadorId, { mesAno, valor: Number(valor) });
      toast.success('Valor salvo!');
      setValorMes({ indexadorId:'', mesAno:'', valor:'' });
      load();
    } catch (e) {
      toast.error('Falha ao salvar valor do indexador.');
    }
  };

  return (
    <div className="adm-grid">
      <section className="card">
        <h3>Gestão de Indexadores</h3>
        <div className="inline-row">
          <input placeholder="Nome do indexador (ex: INCC)" value={novoNome} onChange={e=>setNovoNome(e.target.value)} />
          <button className="button primary" onClick={criarIndexador}><FiPlusCircle /> Criar</button>
        </div>

        <form onSubmit={salvarValor} className="form-grid mt">
          <label>
            Indexador
            <select value={valorMes.indexadorId} onChange={e=>setValorMes(v=>({...v, indexadorId:e.target.value}))} required>
              <option value="" disabled>Selecione</option>
              {indexadores.map(i => <option key={i._id} value={i._id}>{i.nome}</option>)}
            </select>
          </label>
          <label>
            Mês/Ano
            <input placeholder="YYYY-MM" value={valorMes.mesAno} onChange={e=>setValorMes(v=>({...v, mesAno:e.target.value}))} required />
          </label>
          <label>
            Valor (%)
            <input type="number" step="0.0001" value={valorMes.valor} onChange={e=>setValorMes(v=>({...v, valor:e.target.value}))} required />
          </label>
          <div className="modal-actions">
            <button className="button primary" type="submit"><FiSave /> Salvar</button>
          </div>
        </form>

        <div className="list mt">
          {indexadores.map(i => (
            <details key={i._id} className="indexador-item">
              <summary>{i.nome}</summary>
              <ul>
                {(i.valores || []).map(v => (
                  <li key={v.mesAno}>{v.mesAno}: {v.valor}%</li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <h3>Gestão de Credores</h3>
          <button className="button primary" onClick={()=>setModalCredor(true)}><FiPlusCircle /> Novo Credor</button>
        </div>
        <ul className="list">
          {credores.map(c => (
            <li key={c._id} className="list-item">
              <strong>{c.nome}</strong> <span className="muted">({c.tipo})</span>
            </li>
          ))}
          {credores.length === 0 && <li className="muted">Nenhum credor cadastrado.</li>}
        </ul>
      </section>

      <CriarCredorModal open={modalCredor} onClose={()=>setModalCredor(false)} onSuccess={()=>load()} />
    </div>
  );
}
