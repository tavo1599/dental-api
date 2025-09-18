// src/patients/patients.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  async create(createPatientDto: CreatePatientDto, tenantId: string) {
    const newPatient = this.patientRepository.create({
      ...createPatientDto,
      tenant: { id: tenantId }, // Asocia el paciente al tenant del usuario
    });
    return this.patientRepository.save(newPatient);
  }

  async findAll(tenantId: string) {
    // Busca solo los pacientes que pertenecen al tenant del usuario
    return this.patientRepository.find({
      where: { tenant: { id: tenantId } },
    });
  }

  async findOne(id: string, tenantId: string) {
    const patient = await this.patientRepository.findOne({
      where: { id, tenant: { id: tenantId } }, // Doble filtro de seguridad
    });
    if (!patient) {
      throw new NotFoundException(`Patient with ID "${id}" not found`);
    }
    return patient;
  }

  // AÑADE ESTE NUEVO MÉTODO
  async update(id: string, updatePatientDto: UpdatePatientDto, tenantId: string) {
    // Primero, verifica que el paciente exista y pertenezca al tenant
    const patient = await this.findOne(id, tenantId);
    
    // Mezcla los datos existentes con los nuevos
    const updatedPatient = this.patientRepository.merge(patient, updatePatientDto);
    
    return this.patientRepository.save(updatedPatient);
  }

  // AÑADE ESTE NUEVO MÉTODO
  async remove(id: string, tenantId: string) {
    // Verifica que el paciente exista y pertenezca al tenant
    const patient = await this.findOne(id, tenantId);
    
    await this.patientRepository.remove(patient);
    return { message: `Patient with ID "${id}" successfully removed` };
  }
}