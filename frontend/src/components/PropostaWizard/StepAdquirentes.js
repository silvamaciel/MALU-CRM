// src/components/PropostaWizard/StepAdquirentes.js
import React from 'react';
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import './StepAdquirentes.css';
import './WizardSteps.css';

const ESTADO_CIVIL_OPCOES = ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União Estável", "Outro"];

function StepAdquirentes({ formData, setFormData }) {
  const handlePrincipalChange = (e) => {
    const { name, value } = e.target;
    const adquirentes = [...formData.adquirentes];
    adquirentes[0] = { ...adquirentes[0], [name]: value };
    setFormData(prev => ({ ...prev, adquirentes }));
  };

  const handlePrincipalPhoneChange = (value) => {
    const adquirentes = [...formData.adquirentes];
    adquirentes[0] = { ...adquirentes[0], contato: value };
    setFormData(prev => ({ ...prev, adquirentes }));
  };

  const handleCoadquirenteChange = (index, e) => {
    const { name, value } = e.target;
    const coadquirenteIndex = index + 1;
    const adquirentes = [...formData.adquirentes];
    adquirentes[coadquirenteIndex] = { ...adquirentes[coadquirenteIndex], [name]: value };
    setFormData(prev => ({ ...prev, adquirentes }));
  };

  const handleCoadquirentePhoneChange = (index, value) => {
    const coadquirenteIndex = index + 1;
    const adquirentes = [...formData.adquirentes];
    adquirentes[coadquirenteIndex] = { ...adquirentes[coadquirenteIndex], contato: value };
    setFormData(prev => ({ ...prev, adquirentes }));
  };

  const handleAddCoadquirente = () => {
    setFormData(prev => ({
      ...prev,
      adquirentes: [
        ...prev.adquirentes,
        { nome: '', cpf: '', rg: '', nacionalidade: 'Brasileiro(a)', estadoCivil: '', profissao: '' }
      ]
    }));
  };

  const handleRemoveCoadquirente = (index) => {
    const adquirentes = [...formData.adquirentes];
    adquirentes.splice(index + 1, 1);
    setFormData(prev => ({ ...prev, adquirentes }));
  };

  const adquirentePrincipal = formData.adquirentes?.[0] || {};
  const coadquirentes = formData.adquirentes?.slice(1) || [];

  return (
    <div className="wizard-step">
      <h3>Etapa 1: Adquirentes</h3>

      <div className="adquirente-form-section principal">
        <h4>Adquirente Principal</h4>

        <div className="form-row">
          <div className="form-group">
            <label>Nome Completo*</label>
            <input type="text" name="nome" value={adquirentePrincipal.nome || ''} onChange={handlePrincipalChange} required />
          </div>
          <div className="form-group">
            <label>CPF</label>
            <input type="text" name="cpf" value={adquirentePrincipal.cpf || ''} onChange={handlePrincipalChange} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>RG</label>
            <input type="text" name="rg" value={adquirentePrincipal.rg || ''} onChange={handlePrincipalChange} />
          </div>
          <div className="form-group">
            <label>Data de Nascimento</label>
            <input type="date" name="nascimento" value={adquirentePrincipal.nascimento ? new Date(adquirentePrincipal.nascimento).toISOString().split('T')[0] : ''} onChange={handlePrincipalChange} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Estado Civil</label>
            <select name="estadoCivil" value={adquirentePrincipal.estadoCivil || ''} onChange={handlePrincipalChange}>
              <option value="">Selecione...</option>
              {ESTADO_CIVIL_OPCOES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Profissão</label>
            <input type="text" name="profissao" value={adquirentePrincipal.profissao || ''} onChange={handlePrincipalChange} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Telefone de Contato*</label>
            <PhoneInput
              defaultCountry="BR"
              value={adquirentePrincipal.contato || ''}
              onChange={handlePrincipalPhoneChange}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={adquirentePrincipal.email || ''} onChange={handlePrincipalChange} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group full-width">
            <label>Endereço Completo</label>
            <input type="text" name="endereco" value={adquirentePrincipal.endereco || ''} onChange={handlePrincipalChange} />
          </div>
        </div>
      </div>

      {coadquirentes.map((coad, index) => (
        <div key={index} className="adquirente-form-section coadquirente">
          <div className="coadquirente-header">
            <h4>Coadquirente {index + 1}</h4>
            <button type="button" onClick={() => handleRemoveCoadquirente(index)} className="button-link delete-link">Remover</button>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Nome Completo*</label>
              <input type="text" name="nome" value={coad.nome || ''} onChange={(e) => handleCoadquirenteChange(index, e)} required />
            </div>
            <div className="form-group">
              <label>CPF</label>
              <input type="text" name="cpf" value={coad.cpf || ''} onChange={(e) => handleCoadquirenteChange(index, e)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>RG</label>
              <input type="text" name="rg" value={coad.rg || ''} onChange={(e) => handleCoadquirenteChange(index, e)} />
            </div>
            <div className="form-group">
              <label>Data de Nascimento</label>
              <input type="date" name="nascimento" value={coad.nascimento ? new Date(coad.nascimento).toISOString().split('T')[0] : ''} onChange={(e) => handleCoadquirenteChange(index, e)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Estado Civil</label>
              <select name="estadoCivil" value={coad.estadoCivil || ''} onChange={(e) => handleCoadquirenteChange(index, e)}>
                <option value="">Selecione...</option>
                {ESTADO_CIVIL_OPCOES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Profissão</label>
              <input type="text" name="profissao" value={coad.profissao || ''} onChange={(e) => handleCoadquirenteChange(index, e)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Telefone de Contato*</label>
              <PhoneInput
                defaultCountry="BR"
                value={coad.contato || ''}
                onChange={(value) => handleCoadquirentePhoneChange(index, value)}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={coad.email || ''} onChange={(e) => handleCoadquirenteChange(index, e)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label>Endereço Completo</label>
              <input type="text" name="endereco" value={coad.endereco || ''} onChange={(e) => handleCoadquirenteChange(index, e)} />
            </div>
          </div>
        </div>
      ))}

      <button type="button" onClick={handleAddCoadquirente} className="button outline-button">
        + Adicionar Coadquirente
      </button>
    </div>
  );
}

export default StepAdquirentes;
